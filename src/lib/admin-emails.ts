/**
 * E-mails com acesso ao painel administrativo.
 *
 * No navegador esta lista só serve para mostrar/esconder o link "Painel".
 * A proteção de verdade acontece no servidor, em `requireAdmin()`
 * (src/lib/admin-auth.ts), que confere o token de login de cada chamada.
 *
 * Para trocar a lista sem mexer no código, defina na Vercel a variável
 * ADMIN_EMAILS (separados por vírgula). Ela vale só para o servidor.
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
