"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { hojeSP } from "@/lib/datas";
import type { Novidade } from "@/lib/types";

/*
 * Janela de "Novidades" (promoções, eventos, avisos) exibida ao abrir o site.
 * Cada novidade pode ficar no ar:
 *   - sempre ............ até ser desativada
 *   - dias .............. por X dias a partir de hoje
 *   - data .............. só em uma data específica
 *   - periodo ........... da data X até a data Y
 */

const MODOS = ["sempre", "dias", "data", "periodo"] as const;
const ACOES = ["agendar", "whatsapp", "link", "nenhum"] as const;
const TIPOS = ["promocao", "evento", "novidade"] as const;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function estaNoAr(n: Novidade, hoje: string): boolean {
  if (n.ativo === false) return false;
  if (n.inicio && n.inicio > hoje) return false;
  if (n.fim && n.fim < hoje) return false;
  return true;
}

/* ================= PÚBLICO ================= */

/** Novidades no ar hoje (fuso de São Paulo), mais recentes primeiro. */
export async function getNovidadesAtivas(): Promise<Novidade[]> {
  const { data, error } = await supabaseAdmin
    .from("novidades")
    .select("*")
    .eq("ativo", true)
    .order("id", { ascending: false })
    .limit(20);
  if (error) return [];
  const hoje = hojeSP();
  return ((data ?? []) as Novidade[]).filter((n) => estaNoAr(n, hoje)).slice(0, 5);
}

/* ================= ADMIN ================= */

export async function adminGetNovidades(): Promise<{ itens: Novidade[]; semTabela: boolean }> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("novidades")
    .select("*")
    .order("id", { ascending: false });
  if (error) return { itens: [], semTabela: true };
  return { itens: (data ?? []) as Novidade[], semTabela: false };
}

export async function adminSaveNovidade(
  n: Partial<Novidade> & { dias?: number | string | null }
): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();

  const titulo = String(n.titulo ?? "").trim();
  if (titulo.length < 3) return { ok: false, erro: "Informe um título (mín. 3 letras)." };
  if (titulo.length > 90) return { ok: false, erro: "Título muito longo (máx. 90 caracteres)." };

  const modo = (MODOS as readonly string[]).includes(String(n.modo)) ? String(n.modo) : "sempre";
  const hoje = hojeSP();
  let inicio: string | null = null;
  let fim: string | null = null;

  if (modo === "dias") {
    const dias = Math.round(Number(n.dias));
    if (!Number.isFinite(dias) || dias < 1 || dias > 365) return { ok: false, erro: "Informe de 1 a 365 dias." };
    inicio = n.inicio && DATA.test(n.inicio) ? n.inicio : hoje;
    fim = somarDias(inicio, dias - 1);
  } else if (modo === "data") {
    if (!n.inicio || !DATA.test(n.inicio)) return { ok: false, erro: "Escolha a data." };
    inicio = fim = n.inicio;
  } else if (modo === "periodo") {
    if (!n.inicio || !DATA.test(n.inicio) || !n.fim || !DATA.test(n.fim))
      return { ok: false, erro: "Escolha a data inicial e a final." };
    if (n.fim < n.inicio) return { ok: false, erro: "A data final precisa ser depois da inicial." };
    inicio = n.inicio;
    fim = n.fim;
  }

  const acao = (ACOES as readonly string[]).includes(String(n.botao_acao)) ? String(n.botao_acao) : "agendar";
  const link = String(n.botao_link ?? "").trim();
  if (acao === "link" && !/^(https:\/\/|\/)/.test(link))
    return { ok: false, erro: "O link precisa começar com https:// ou / (página do site)." };

  const imagem = String(n.imagem ?? "").trim() || null;
  if (imagem && !/^https:\/\//.test(imagem)) return { ok: false, erro: "A imagem precisa ser um link https." };

  const registro = {
    titulo,
    chamada: String(n.chamada ?? "").trim().slice(0, 80) || null,
    descricao: String(n.descricao ?? "").trim().slice(0, 1200) || null,
    imagem,
    tipo: (TIPOS as readonly string[]).includes(String(n.tipo)) ? String(n.tipo) : "novidade",
    botao_acao: acao,
    botao_texto: String(n.botao_texto ?? "").trim().slice(0, 40) || null,
    botao_link: acao === "link" ? link.slice(0, 300) : null,
    modo,
    inicio,
    fim,
    abrir_automatico: n.abrir_automatico === true,
    ativo: n.ativo !== false,
  };

  const { error } = n.id
    ? await supabaseAdmin.from("novidades").update(registro).eq("id", Number(n.id))
    : await supabaseAdmin.from("novidades").insert(registro);
  if (error) {
    if (/novidades/.test(error.message))
      return { ok: false, erro: "A tabela de novidades ainda não existe. Rode o sql-painel-v2.sql no Supabase." };
    return { ok: false, erro: error.message };
  }
  return { ok: true };
}

export async function adminSetNovidadeAtiva(id: number, ativo: boolean): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("novidades").update({ ativo: !!ativo }).eq("id", Number(id));
  return error ? { ok: false, erro: error.message } : { ok: true };
}

export async function adminDeleteNovidade(id: number): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("novidades").delete().eq("id", Number(id));
  return error ? { ok: false, erro: error.message } : { ok: true };
}

export async function uploadNovidadeImagem(file: File): Promise<{ url?: string; erro?: string }> {
  await requireAdmin();
  if (!(file instanceof File)) return { erro: "Arquivo inválido." };
  if (file.size > 8 * 1024 * 1024) return { erro: "Imagem maior que 8MB." };
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return { erro: "Use PNG, JPG ou WEBP." };
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `novidade_${Date.now()}_${Math.random().toString(36).slice(2, 11)}.${ext}`;
  // usa o bucket público da galeria (já existe e é liberado para leitura)
  const { error } = await supabaseAdmin.storage
    .from("galeria")
    .upload(path, await file.arrayBuffer(), { contentType: file.type });
  if (error) return { erro: "Falha no upload da imagem." };
  return { url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/galeria/${path}` };
}
