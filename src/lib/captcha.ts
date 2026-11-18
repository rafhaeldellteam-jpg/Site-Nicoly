/**
 * Verificação do captcha (Cloudflare Turnstile) no servidor.
 *
 * Ligado quando a variável TURNSTILE_SECRET_KEY existe na Vercel.
 * Sem ela, o captcha fica desligado e tudo funciona como antes —
 * assim o site não quebra enquanto as chaves não são configuradas.
 */
export function captchaLigado(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

export async function verificarCaptcha(token: string | null | undefined, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token || typeof token !== "string" || token.length > 2048) return false;
  try {
    const corpo = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "anon") corpo.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: corpo,
      cache: "no-store",
    });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch (err) {
    // se a Cloudflare estiver fora do ar, não bloqueia as clientes
    console.error("captcha:", err);
    return true;
  }
}

export const ERRO_CAPTCHA = "Confirme que você não é um robô e tente de novo.";
