"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import type { BlogPost, Promocao, Referral, Newsletter } from "@/lib/types";

/* ================= BLOG (PUBLICO) ================= */

export async function getPublishedPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabaseAdmin
    .from("blog_posts")
    .select("*")
    .eq("publicado", true)
    .order("criado_em", { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabaseAdmin
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("publicado", true)
    .single();
  if (error) return null;
  return data;
}

export async function getAllSlugs(): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("blog_posts")
    .select("slug")
    .eq("publicado", true);
  return (data ?? []).map((r: { slug: string }) => r.slug);
}

/* ================= PROMOCOES (PUBLICO) ================= */

export async function getActivePromocoes(): Promise<Promocao[]> {
  const { data, error } = await supabaseAdmin
    .from("promocoes")
    .select("*")
    .eq("ativa", true)
    .order("criado_em", { ascending: false });
  if (error) return [];
  return data ?? [];
}

/* ================= NEWSLETTER ================= */

export async function subscribeNewsletter(
  nome: string,
  contato: string,
  tipo: string = "whatsapp"
): Promise<{ ok: boolean; msg: string }> {
  if (!rateLimit("newsletter", 3, 30 * 60 * 1000)) return { ok: false, msg: "Aguarde antes de se inscrever novamente." };

  const { error } = await supabaseAdmin.from("newsletter").insert({
    nome: nome || null,
    contato,
    tipo,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, msg: "Este contato ja esta inscrito." };
    return { ok: false, msg: "Erro ao inscrever. Tente novamente." };
  }
  return { ok: true, msg: "Inscrito com sucesso!" };
}

/* ================= REFERRALS (INDICACAO) ================= */

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createReferral(
  name: string,
  whatsapp: string
): Promise<{ ok: boolean; code?: string; msg: string }> {
  if (!rateLimit("referral", 3, 30 * 60 * 1000)) return { ok: false, msg: "Aguarde antes de criar outro codigo." };

  const code = generateCode();
  const { error } = await supabaseAdmin.from("referrals").insert({
    code,
    referrer_name: name,
    referrer_whatsapp: whatsapp,
  });
  if (error) return { ok: false, msg: "Erro ao gerar codigo." };
  return { ok: true, code, msg: "Codigo criado!" };
}

export async function useReferral(
  code: string,
  referredName: string,
  referredWhatsapp: string
): Promise<{ ok: boolean; msg: string }> {
  if (!rateLimit("use-referral", 3, 30 * 60 * 1000)) return { ok: false, msg: "Aguarde antes de usar um codigo." };

  const { data: ref, error: findErr } = await supabaseAdmin
    .from("referrals")
    .select("id, status")
    .eq("code", code.toUpperCase())
    .single();

  if (findErr || !ref) return { ok: false, msg: "Codigo invalido." };
  if (ref.status !== "pendente") return { ok: false, msg: "Este codigo ja foi utilizado." };

  const { error } = await supabaseAdmin
    .from("referrals")
    .update({
      referred_name: referredName,
      referred_whatsapp: referredWhatsapp,
      status: "utilizado",
    })
    .eq("id", ref.id);

  if (error) return { ok: false, msg: "Erro ao registrar indicacao." };
  return { ok: true, msg: "Indicacao registrada! Apresente o codigo no atendimento." };
}

/* ================= ADMIN ================= */

export async function adminGetBlogPosts(): Promise<BlogPost[]> {
  const { data } = await supabaseAdmin
    .from("blog_posts")
    .select("*")
    .order("criado_em", { ascending: false });
  return data ?? [];
}

export async function adminSaveBlogPost(post: Omit<BlogPost, "id" | "criado_em"> & { id?: number }): Promise<boolean> {
  if (post.id) {
    const { error } = await supabaseAdmin.from("blog_posts").update(post).eq("id", post.id);
    return !error;
  }
  const { error } = await supabaseAdmin.from("blog_posts").insert(post);
  return !error;
}

export async function adminDeleteBlogPost(id: number): Promise<boolean> {
  const { error } = await supabaseAdmin.from("blog_posts").delete().eq("id", id);
  return !error;
}

export async function adminGetPromocoes(): Promise<Promocao[]> {
  const { data } = await supabaseAdmin
    .from("promocoes")
    .select("*")
    .order("criado_em", { ascending: false });
  return data ?? [];
}

export async function adminSavePromocao(promo: Omit<Promocao, "id" | "criado_em"> & { id?: number }): Promise<boolean> {
  if (promo.id) {
    const { error } = await supabaseAdmin.from("promocoes").update(promo).eq("id", promo.id);
    return !error;
  }
  const { error } = await supabaseAdmin.from("promocoes").insert(promo);
  return !error;
}

export async function adminDeletePromocao(id: number): Promise<boolean> {
  const { error } = await supabaseAdmin.from("promocoes").delete().eq("id", id);
  return !error;
}

export async function adminGetNewsletter(): Promise<Newsletter[]> {
  const { data } = await supabaseAdmin
    .from("newsletter")
    .select("*")
    .order("criado_em", { ascending: false });
  return data ?? [];
}

export async function adminDeleteNewsletter(id: number): Promise<boolean> {
  const { error } = await supabaseAdmin.from("newsletter").delete().eq("id", id);
  return !error;
}

export async function adminGetReferrals(): Promise<Referral[]> {
  const { data } = await supabaseAdmin
    .from("referrals")
    .select("*")
    .order("criado_em", { ascending: false });
  return data ?? [];
}