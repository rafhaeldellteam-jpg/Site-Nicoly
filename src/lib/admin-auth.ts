import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { ADMIN_EMAILS } from "@/lib/admin-emails";

const AUTH_COOKIE = "nic_at";

function adminList(): Set<string> {
  const env = process.env.ADMIN_EMAILS;
  const lista = env ? env.split(",") : [...ADMIN_EMAILS];
  return new Set(lista.map((e) => e.trim().toLowerCase()).filter(Boolean));
}

/**
 * Confere, no servidor, se quem chamou a ação é uma administradora logada.
 * Lança erro caso contrário — nenhuma ação de admin roda sem passar por aqui.
 */
export async function requireAdmin(): Promise<{ email: string }> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) throw new Error("Não autorizado.");

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (error || !email || !adminList().has(email)) throw new Error("Não autorizado.");
  return { email };
}

/** Retorna o usuário logado (qualquer cliente) a partir do cookie, ou null. */
export async function currentUser(): Promise<{ id: string; email: string; nome: string | null } | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user?.email) return null;
  const meta = (data.user.user_metadata ?? {}) as Record<string, string | undefined>;
  return {
    id: data.user.id,
    email: data.user.email,
    nome: meta.nome ?? meta.full_name ?? meta.name ?? null,
  };
}
