"use server";

import { currentUser, emailEhAdmin } from "@/lib/admin-auth";

/**
 * Diz se a pessoa logada (pelo cookie de login) é administradora ativa.
 * Usado pelo painel e pela barra do site para mostrar o acesso ao painel.
 */
export async function souAdmin(): Promise<boolean> {
  const u = await currentUser();
  if (!u) return false;
  return emailEhAdmin(u.email);
}
