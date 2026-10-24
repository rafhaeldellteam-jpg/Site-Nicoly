/**
 * LISTA DE RESERVA de administradoras.
 *
 * Quem tem acesso ao painel agora é controlado pela tabela
 * "administradores" no Supabase (Table Editor → administradores),
 * conferida no servidor em src/lib/admin-auth.ts.
 *
 * Esta lista só é usada se a tabela ainda não existir, para ninguém
 * ficar trancado para fora do painel.
 */
export const ADMIN_EMAILS: readonly string[] = [
  "phael.techsuporte@gmail.com",
  "phael.techsuporte2@gmail.com",
  "nicbeautty@gmail.com",
];

export const ADMIN_EMAILS_SET: ReadonlySet<string> = new Set(
  ADMIN_EMAILS.map((e) => e.toLowerCase())
);

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS_SET.has(email.trim().toLowerCase());
}
