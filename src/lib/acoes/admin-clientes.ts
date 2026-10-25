"use server";

/** Painel: contas de clientes criadas no site. */

import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import type { ClienteInfo } from "@/lib/types";

export async function adminListClientes(): Promise<ClienteInfo[]> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 });
  if (error) return [];
  return (data.users ?? []).map((u) => {
    const meta = (u.user_metadata ?? {}) as Record<string, string>;
    return {
      id: u.id,
      email: u.email ?? "",
      nome: meta.nome ?? meta.full_name ?? meta.name ?? null,
      telefone: meta.telefone ?? meta.phone ?? null,
      provedor:
        (u.app_metadata?.provider as string) ||
        (u.identities?.[0]?.provider as string) ||
        "email",
      criado_em: u.created_at ?? "",
    };
  });
}
