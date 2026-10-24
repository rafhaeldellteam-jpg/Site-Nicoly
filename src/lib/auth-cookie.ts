"use client";

import type { Session } from "@supabase/supabase-js";

/** Nome do cookie que leva o token de login para as ações do servidor. */
export const AUTH_COOKIE = "nic_at";

/**
 * Copia o token de acesso do Supabase (que fica no localStorage) para um
 * cookie, para que as Server Actions consigam confirmar quem está logado.
 * SameSite=Strict impede que outros sites enviem o cookie.
 */
export function syncAuthCookie(session: Session | null): void {
  try {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    if (session?.access_token) {
      const maxAge = Math.max(60, (session.expires_at ?? 0) - Math.floor(Date.now() / 1000));
      document.cookie = `${AUTH_COOKIE}=${session.access_token}; Path=/; Max-Age=${maxAge}; SameSite=Strict${secure}`;
    } else {
      document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict${secure}`;
    }
  } catch {
    /* cookies bloqueados — as ações de admin vão recusar, o que é seguro */
  }
}
