/**
 * Projetos do Supabase de onde o site pode otimizar fotos.
 * O atual vem da variável NEXT_PUBLIC_SUPABASE_URL configurada na Vercel;
 * os outros ficam por compatibilidade com links antigos salvos no banco.
 */
const HOSTS_SUPABASE = new Set(
  [
    process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null,
    "bghnoezksqxslojuvdrr.supabase.co",
    "jfqfbpjimozevtjscbej.supabase.co",
  ].filter(Boolean) as string[]
);

/** Logo da marca guardada no próprio site (não depende do Supabase). */
export const LOGO_MARCA = "/icons/icon-512.png";

/** Foto da Nicoly guardada no próprio site (topo da página e "Nossa equipe"). */
export const FOTO_NICOLY = "/images/nicoly.webp";

/**
 * O otimizador de imagens do Next só aceita fotos do Supabase do salão
 * (e arquivos do próprio site). Se a administradora colar um link de outro
 * site, a imagem é mostrada sem otimização em vez de quebrar a página.
 */
export function imagemOtimizavel(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/")) return true;
  try {
    const u = new URL(url);
    return HOSTS_SUPABASE.has(u.hostname) && u.pathname.startsWith("/storage/v1/object/public/");
  } catch {
    return false;
  }
}
