"use server";

/** Leituras públicas do site (catálogo, galeria, equipe, avaliações) e envio de avaliações. */

import { supabaseAdmin } from "@/lib/supabase";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { enviarImagem, ordenarServicos } from "@/lib/servidor";
import type { Feedback, Funcionario, GaleriaItem, Service } from "@/lib/types";

/** Catálogo público: só serviços ativos, na ordem definida no painel. */
export async function getServices(): Promise<Service[]> {
  const { data, error } = await supabaseAdmin
    .from("services")
    .select("*")
    .order("id", { ascending: true });
  if (error) return [];
  return ordenarServicos(((data ?? []) as Service[]).filter((sv) => sv.ativo !== false));
}

export async function getGaleria(): Promise<GaleriaItem[]> {
  const { data, error } = await supabaseAdmin
    .from("galeria")
    .select("*")
    .order("ordem", { ascending: true })
    .order("id", { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function getFuncionarios(): Promise<Funcionario[]> {
  const { data, error } = await supabaseAdmin
    .from("funcionarios")
    .select("*")
    .order("ordem", { ascending: true })
    .order("id", { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function getApprovedFeedbacks(): Promise<Feedback[]> {
  const { data, error } = await supabaseAdmin
    .from("feedbacks")
    .select("*")
    .eq("aprovado", true)
    .order("id", { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function createFeedback(input: {
  nome: string;
  instagram?: string;
  estrelas: number;
  comentario?: string;
  fotosUrls?: string[];
}): Promise<{ ok: boolean; erro?: string }> {
  const ip = await clientIp();
  if (!(await rateLimit(`fb:${ip}`, 3, 30 * 60 * 1000)))
    return { ok: false, erro: "Muitos envios. Aguarde um pouco." };

  const nome = String(input.nome ?? "").trim();
  if (nome.length < 2 || nome.length > 60) return { ok: false, erro: "Nome inválido." };
  const estrelas = Math.min(5, Math.max(1, Math.round(input.estrelas)));
  if (estrelas < 1) return { ok: false, erro: "Escolha as estrelas." };
  if ((input.comentario ?? "").length > 500) return { ok: false, erro: "Comentário muito longo." };
  // só aceita fotos que foram enviadas para o nosso próprio bucket
  const prefixo = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/feedbacks/`;
  const urls = (Array.isArray(input.fotosUrls) ? input.fotosUrls : [])
    .filter((u) => typeof u === "string" && u.startsWith(prefixo))
    .slice(0, 5);
  const instagram = String(input.instagram ?? "").trim().replace(/^@/, "").slice(0, 40);
  if (instagram && !/^[\w.]+$/.test(instagram)) return { ok: false, erro: "Instagram inválido." };

  const { error } = await supabaseAdmin.from("feedbacks").insert({
    nome,
    instagram: instagram || null,
    estrelas,
    comentario: input.comentario?.trim() || null,
    imagens: urls,
    aprovado: false,
  });
  if (error) return { ok: false, erro: "Erro ao enviar avaliação." };
  return { ok: true };
}

export async function uploadFeedbackPhoto(file: File): Promise<{ url?: string; erro?: string }> {
  const ip = await clientIp();
  if (!(await rateLimit(`fbfoto:${ip}`, 10, 60 * 60 * 1000)))
    return { erro: "Muitas fotos enviadas. Aguarde um pouco." };
  return enviarImagem("feedbacks", file, { prefixo: "", maxMB: 5 });
}
