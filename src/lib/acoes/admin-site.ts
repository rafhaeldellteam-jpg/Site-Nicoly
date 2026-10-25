"use server";

/** Painel: catálogo, galeria, equipe e moderação das avaliações. */

import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { formatarDuracao } from "@/lib/agenda";
import { atualizarPaginasPublicas, enviarImagem, ordenarServicos, resultado } from "@/lib/servidor";
import type { Feedback, Funcionario, GaleriaItem, Service } from "@/lib/types";

export async function adminGetAllServices(): Promise<Service[]> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("services")
    .select("*")
    .order("id", { ascending: true });
  if (error) return [];
  return ordenarServicos((data ?? []) as Service[]);
}

const COLUNAS_NOVAS_SERVICO = ["duracao_min", "ativo", "destaque", "ordem"] as const;

export async function adminSaveService(
  service: Partial<Service>
): Promise<{ ok: boolean; erro?: string; id?: number }> {
  await requireAdmin();

  const nome = String(service.nome ?? "").trim();
  if (nome.length < 2) return { ok: false, erro: "Informe o nome do serviço." };
  if (nome.length > 80) return { ok: false, erro: "Nome muito longo (máx. 80 caracteres)." };

  const preco =
    service.preco === null || service.preco === undefined || String(service.preco).trim() === ""
      ? null
      : Number(String(service.preco).replace(",", "."));
  if (preco !== null && (!Number.isFinite(preco) || preco < 0 || preco > 100000))
    return { ok: false, erro: "Preço inválido." };

  const duracaoMin = service.duracao_min ? Math.round(Number(service.duracao_min)) : null;
  if (duracaoMin !== null && (!Number.isFinite(duracaoMin) || duracaoMin < 10 || duracaoMin > 600))
    return { ok: false, erro: "Duração inválida (entre 10 min e 10h)." };

  const imagem = service.imagem ? String(service.imagem).trim() : null;
  if (imagem && !/^https:\/\//.test(imagem)) return { ok: false, erro: "A imagem precisa ser um link https." };

  const manutencao = (Array.isArray(service.manutencao) ? service.manutencao : [])
    .map((m) => ({ valor: String(m?.valor ?? "").trim().slice(0, 40), prazo: String(m?.prazo ?? "").trim().slice(0, 40) }))
    .filter((m) => m.valor)
    .slice(0, 6);

  const registro: Record<string, unknown> = {
    nome,
    descricao: String(service.descricao ?? "").trim().slice(0, 600) || null,
    duracao: String(service.duracao ?? "").trim().slice(0, 40) || (duracaoMin ? formatarDuracao(duracaoMin) : null),
    aplicacao: String(service.aplicacao ?? "").trim().slice(0, 120) || null,
    manutencao,
    imagem,
    textobotao: String(service.textobotao ?? "").trim().slice(0, 40) || null,
    preco,
    duracao_min: duracaoMin,
    ativo: service.ativo !== false,
    destaque: service.destaque === true,
    ordem: Number.isFinite(Number(service.ordem)) ? Math.round(Number(service.ordem)) : 0,
  };

  const id = service.id && Number(service.id) > 0 ? Number(service.id) : null;

  const gravar = (dados: Record<string, unknown>) =>
    id
      ? supabaseAdmin.from("services").update(dados).eq("id", id).select("id").single()
      : supabaseAdmin.from("services").insert(dados).select("id").single();

  let { data, error } = await gravar(registro);
  // banco ainda sem as colunas novas (sql-painel-v2.sql não rodado): salva o básico
  if (error && COLUNAS_NOVAS_SERVICO.some((c) => error!.message.includes(c))) {
    const basico = { ...registro };
    for (const c of COLUNAS_NOVAS_SERVICO) delete basico[c];
    ({ data, error } = await gravar(basico));
  }
  if (error) return { ok: false, erro: "Não foi possível salvar: " + error.message };

  atualizarPaginasPublicas();
  return { ok: true, id: (data as { id: number } | null)?.id ?? id ?? undefined };
}

export async function adminDeleteService(id: number): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("services").delete().eq("id", Number(id));
  if (error) return { ok: false, erro: error.message };
  atualizarPaginasPublicas();
  return { ok: true };
}

export async function uploadServiceImage(file: File): Promise<{ url?: string; erro?: string }> {
  await requireAdmin();
  return enviarImagem("products", file, { prefixo: "", maxMB: 8 });
}

export async function adminGetGaleria(): Promise<GaleriaItem[]> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("galeria")
    .select("*")
    .order("ordem", { ascending: true })
    .order("id", { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function adminSaveGaleria(item: GaleriaItem): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  if (!item.titulo?.trim()) return { ok: false, erro: "Título obrigatório." };
  if (!item.imagem) return { ok: false, erro: "Envie uma imagem." };
  const registro = {
    ...(item.id ? { id: item.id } : {}),
    titulo: item.titulo.trim(),
    descricao: item.descricao?.trim() || null,
    imagem: item.imagem,
    ordem: item.ordem ?? 0,
  };
  const { error } = await supabaseAdmin.from("galeria").upsert(registro, { onConflict: "id" });
  return resultado(error);
}

export async function adminDeleteGaleria(id: number): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("galeria").delete().eq("id", id);
  return resultado(error);
}

export async function uploadGaleriaImagem(file: File): Promise<{ url?: string; erro?: string }> {
  await requireAdmin();
  return enviarImagem("galeria", file, { prefixo: "galeria_", maxMB: 8 });
}

export async function adminGetFuncionarios(): Promise<Funcionario[]> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("funcionarios")
    .select("*")
    .order("ordem", { ascending: true })
    .order("id", { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function adminSaveFuncionario(
  f: Funcionario
): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  if (!f.nome?.trim()) return { ok: false, erro: "Nome obrigatório." };
  const registro = {
    ...(f.id ? { id: f.id } : {}),
    nome: f.nome.trim(),
    especialidade: f.especialidade?.trim() || null,
    bio: f.bio?.trim() || null,
    foto: f.foto || null,
    ativo: f.ativo ?? true,
    ordem: f.ordem ?? 0,
  };
  const { error } = await supabaseAdmin.from("funcionarios").upsert(registro, { onConflict: "id" });
  return resultado(error);
}

export async function adminDeleteFuncionario(id: number): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("funcionarios").delete().eq("id", id);
  return resultado(error);
}

export async function uploadFuncionarioFoto(file: File): Promise<{ url?: string; erro?: string }> {
  await requireAdmin();
  return enviarImagem("funcionarios", file, { prefixo: "func_", maxMB: 5 });
}

export async function adminGetFeedbacks(): Promise<Feedback[]> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("feedbacks")
    .select("*")
    .order("id", { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function adminSetFeedbackAprovado(
  id: number,
  aprovado: boolean
): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  const { error } = await supabaseAdmin
    .from("feedbacks")
    .update({ aprovado })
    .eq("id", id);
  return resultado(error);
}

export async function adminDeleteFeedback(id: number): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("feedbacks").delete().eq("id", id);
  return resultado(error);
}
