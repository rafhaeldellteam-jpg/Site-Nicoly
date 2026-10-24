const SUPABASE_HOST = "jfqfbpjimozevtjscbej.supabase.co";

/**
 * O otimizador de imagens do Next só aceita fotos do Supabase do salão.
 * Se a administradora colar um link de outro site, a imagem é mostrada
 * sem otimização em vez de quebrar a página.
 */
export function imagemOtimizavel(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.hostname === SUPABASE_HOST && u.pathname.startsWith("/storage/v1/object/public/");
  } catch {
    return false;
  }
}
