import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

/*
 * Limite de tentativas.
 *
 * Usa a função `hit_rate_limit` do Supabase (criada em sql-seguranca.sql), que
 * vale para todas as instâncias da Vercel. Se a função ainda não existir no
 * banco, cai para um limite em memória (menos eficaz, mas melhor que nada).
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

function memoria(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

/** Retorna true se a ação está liberada, false se passou do limite. */
export async function rateLimit(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
  const local = memoria(key, maxRequests, windowMs);
  if (!local) return false;
  try {
    const { data, error } = await supabaseAdmin.rpc("hit_rate_limit", {
      p_key: key.slice(0, 200),
      p_max: maxRequests,
      p_window_seconds: Math.ceil(windowMs / 1000),
    });
    if (error) return local;
    return data !== false;
  } catch {
    return local;
  }
}

/** IP de quem fez a requisição (a Vercel preenche x-forwarded-for). */
export async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return h.get("x-real-ip") ?? "anon";
  } catch {
    return "anon";
  }
}
