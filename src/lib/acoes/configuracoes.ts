"use server";

/**
 * Configurações simples do site, editadas no painel (tabela "configuracoes").
 * Só as chaves listadas aqui existem — nada de chaves livres vindas do navegador.
 */

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

const CHAVES = {
  /** link "Avaliar no Google" (Perfil da Empresa → Pedir avaliações) */
  google_avaliacao_url: { max: 400, validar: (v: string) => /^https:\/\/(g\.page|search\.google\.com|www\.google\.com|maps\.app\.goo\.gl|g\.co)\//.test(v) },
} as const;

type Chave = keyof typeof CHAVES;

export async function getConfiguracao(chave: Chave): Promise<string | null> {
  if (!(chave in CHAVES)) return null;
  const { data, error } = await supabaseAdmin.from("configuracoes").select("valor").eq("chave", chave).maybeSingle();
  if (error || !data) return null;
  return (data as { valor: string | null }).valor ?? null;
}

export async function adminSetConfiguracao(chave: Chave, valor: string): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  const regra = CHAVES[chave];
  if (!regra) return { ok: false, erro: "Configuração desconhecida." };
  const v = String(valor ?? "").trim().slice(0, regra.max);
  if (v && !regra.validar(v))
    return { ok: false, erro: "Cole o link copiado do Google (começa com https://g.page/ ou https://search.google.com/)." };

  const { error } = await supabaseAdmin
    .from("configuracoes")
    .upsert({ chave, valor: v || null, atualizado_em: new Date().toISOString() }, { onConflict: "chave" });
  if (error) {
    if (/configuracoes/.test(error.message))
      return { ok: false, erro: "Falta criar a tabela de configurações. Rode o SQL 008 no Supabase." };
    return { ok: false, erro: error.message };
  }
  try {
    revalidatePath("/");
  } catch {
    /* ignora */
  }
  return { ok: true };
}
