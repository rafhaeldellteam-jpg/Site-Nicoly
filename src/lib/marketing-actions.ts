"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/admin-auth";

function limpar(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

function contatoValido(contato: string): boolean {
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contato);
  // aceita (11) 99999-9999, 11999999999, +55 11 99999-9999...
  let digitos = contato.replace(/\D/g, "");
  if (digitos.length > 11 && digitos.startsWith("55")) digitos = digitos.slice(2);
  const tel = /^[\d\s()+-]+$/.test(contato) && (digitos.length === 10 || digitos.length === 11);
  return email || tel;
}
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
  const ip = await clientIp();
  if (!(await rateLimit(`newsletter:${ip}`, 3, 30 * 60 * 1000)))
    return { ok: false, msg: "Aguarde antes de se inscrever novamente." };

  const nomeOk = limpar(nome, 80);
  const contatoOk = limpar(contato, 120);
  const tipoOk = tipo === "email" || contatoOk.includes("@") ? "email" : "whatsapp";
  if (!contatoValido(contatoOk)) return { ok: false, msg: "Informe um WhatsApp ou e-mail válido." };

  const { error } = await supabaseAdmin.from("newsletter").insert({
    nome: nomeOk || null,
    contato: contatoOk,
    tipo: tipoOk,
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
  const bytes = new Uint32Array(6);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i++) code += chars[bytes[i] % chars.length];
  return code;
}

export async function createReferral(
  name: string,
  whatsapp: string
): Promise<{ ok: boolean; code?: string; msg: string }> {
  const ip = await clientIp();
  if (!(await rateLimit(`referral:${ip}`, 3, 30 * 60 * 1000)))
    return { ok: false, msg: "Aguarde antes de criar outro codigo." };

  const nome = limpar(name, 80);
  const tel = limpar(whatsapp, 20);
  if (nome.length < 2) return { ok: false, msg: "Informe seu nome." };
  if (!contatoValido(tel)) return { ok: false, msg: "WhatsApp invalido." };

  const code = generateCode();
  const { error } = await supabaseAdmin.from("referrals").insert({
    code,
    referrer_name: nome,
    referrer_whatsapp: tel,
  });
  if (error) return { ok: false, msg: "Erro ao gerar codigo." };
  return { ok: true, code, msg: "Codigo criado!" };
}

export async function useReferral(
  code: string,
  referredName: string,
  referredWhatsapp: string
): Promise<{ ok: boolean; msg: string }> {
  const ip = await clientIp();
  if (!(await rateLimit(`use-referral:${ip}`, 5, 30 * 60 * 1000)))
    return { ok: false, msg: "Aguarde antes de usar um codigo." };

  const nomeIndicada = limpar(referredName, 80);
  const telIndicada = limpar(referredWhatsapp, 20);
  if (nomeIndicada.length < 2) return { ok: false, msg: "Informe seu nome." };
  if (!contatoValido(telIndicada)) return { ok: false, msg: "WhatsApp invalido." };
  const codigo = limpar(code, 12).toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(codigo)) return { ok: false, msg: "Codigo invalido." };

  const { data: ref, error: findErr } = await supabaseAdmin
    .from("referrals")
    .select("id, status")
    .eq("code", codigo)
    .single();

  if (findErr || !ref) return { ok: false, msg: "Codigo invalido." };
  if (ref.status !== "pendente") return { ok: false, msg: "Este codigo ja foi utilizado." };

  const { error } = await supabaseAdmin
    .from("referrals")
    .update({
      referred_name: nomeIndicada,
      referred_whatsapp: telIndicada,
      status: "utilizado",
    })
    .eq("id", ref.id)
    .eq("status", "pendente");

  if (error) return { ok: false, msg: "Erro ao registrar indicacao." };
  return { ok: true, msg: "Indicacao registrada! Apresente o codigo no atendimento." };
}

/* ================= ADMIN ================= */

export async function adminGetBlogPosts(): Promise<BlogPost[]> {
  await requireAdmin();
  const { data } = await supabaseAdmin
    .from("blog_posts")
    .select("*")
    .order("criado_em", { ascending: false });
  return data ?? [];
}

export async function adminSaveBlogPost(post: Omit<BlogPost, "id" | "criado_em"> & { id?: number }): Promise<boolean> {
  await requireAdmin();
  if (post.id) {
    const { error } = await supabaseAdmin.from("blog_posts").update(post).eq("id", post.id);
    return !error;
  }
  const { error } = await supabaseAdmin.from("blog_posts").insert(post);
  return !error;
}

export async function adminDeleteBlogPost(id: number): Promise<boolean> {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("blog_posts").delete().eq("id", id);
  return !error;
}

export async function adminGetPromocoes(): Promise<Promocao[]> {
  await requireAdmin();
  const { data } = await supabaseAdmin
    .from("promocoes")
    .select("*")
    .order("criado_em", { ascending: false });
  return data ?? [];
}

export async function adminSavePromocao(promo: Omit<Promocao, "id" | "criado_em"> & { id?: number }): Promise<boolean> {
  await requireAdmin();
  if (promo.id) {
    const { error } = await supabaseAdmin.from("promocoes").update(promo).eq("id", promo.id);
    return !error;
  }
  const { error } = await supabaseAdmin.from("promocoes").insert(promo);
  return !error;
}

export async function adminDeletePromocao(id: number): Promise<boolean> {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("promocoes").delete().eq("id", id);
  return !error;
}

export async function adminGetNewsletter(): Promise<Newsletter[]> {
  await requireAdmin();
  const { data } = await supabaseAdmin
    .from("newsletter")
    .select("*")
    .order("criado_em", { ascending: false });
  return data ?? [];
}

export async function adminDeleteNewsletter(id: number): Promise<boolean> {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("newsletter").delete().eq("id", id);
  return !error;
}

export async function adminGetReferrals(): Promise<Referral[]> {
  await requireAdmin();
  const { data } = await supabaseAdmin
    .from("referrals")
    .select("*")
    .order("criado_em", { ascending: false });
  return data ?? [];
}