/**
 * Utilidades usadas pelas ações do servidor (src/lib/acoes/*).
 * Não é um arquivo "use server": nada aqui pode ser chamado pelo navegador.
 */
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import type { Appointment, Service } from "@/lib/types";

export { escaparLike, validarEmail, validarTelefone } from "@/lib/texto";

export type Resultado = { ok: boolean; erro?: string };

/** Atualiza as páginas que mostram o catálogo, para a mudança aparecer na hora. */
export function atualizarPaginasPublicas(): void {
  try {
    revalidatePath("/");
    revalidatePath("/catalogo");
    revalidatePath("/planos");
  } catch {
    /* fora de uma requisição — ignora */
  }
}

/** Resposta padrão das ações do painel que mudam algo visível no site. */
export function resultado(error: { message: string } | null): Resultado {
  if (error) return { ok: false, erro: error.message };
  atualizarPaginasPublicas();
  return { ok: true };
}

export function ordenarServicos(lista: Service[]): Service[] {
  return [...lista].sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999) || a.id - b.id);
}

/** Junta o nome do serviço (vindo do join `services(nome)`) no agendamento. */
export function comNomeDoServico(linhas: unknown[] | null): (Appointment & { servico_nome: string | null })[] {
  return ((linhas ?? []) as Record<string, unknown>[]).map((a) => ({
    ...(a as unknown as Appointment),
    servico_nome:
      a.services && typeof a.services === "object" ? ((a.services as { nome?: string }).nome ?? null) : null,
  }));
}

/** Envia uma imagem para um bucket público do Supabase e devolve o link. */
export async function enviarImagem(
  bucket: string,
  file: File,
  opcoes: { prefixo?: string; maxMB?: number } = {}
): Promise<{ url?: string; erro?: string }> {
  const maxMB = opcoes.maxMB ?? 8;
  if (!(file instanceof File)) return { erro: "Arquivo inválido." };
  if (file.size > maxMB * 1024 * 1024) return { erro: `Imagem maior que ${maxMB}MB.` };
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return { erro: "Use PNG, JPG ou WEBP." };
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${opcoes.prefixo ?? ""}${Date.now()}_${Math.random().toString(36).slice(2, 11)}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, await file.arrayBuffer(), { contentType: file.type });
  if (error) return { erro: "Falha no upload da imagem." };
  return { url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}` };
}

/** E-mail que recebe os avisos do salão. */
export function emailDoSalao(): string {
  return process.env.GMAIL_USER || "nicbeautty@gmail.com";
}
