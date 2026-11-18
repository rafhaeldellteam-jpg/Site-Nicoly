"use server";

/** Área "Meus horários": o Plano VIP da cliente logada. */

import { supabaseAdmin } from "@/lib/supabase";
import { hojeSP } from "@/lib/datas";
import { escaparLike } from "@/lib/servidor";
import { VIP_DESIGNS, VIP_MANUTENCOES } from "@/lib/planos";
import { buscarAssinaturas, montarResumos } from "@/lib/planos-resumo";

export interface MeuPlano {
  status: "ativo" | "pendente";
  tecnica: string | null;
  valor: number;
  diasRestantes: number;
  renovacao: string | null;
  progresso: number;
  usadas: number;
  inclusas: number;
  designs: number;
  meses: number;
  sugestao: string | null;
  temHorarioMarcado: boolean;
}

export async function getMeuPlano(accessToken: string): Promise<MeuPlano | null> {
  if (!accessToken || typeof accessToken !== "string") return null;
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  const email = data.user?.email?.toLowerCase();
  if (error || !email) return null;

  const minhas = (await buscarAssinaturas({ email: escaparLike(email) })).filter(
    (a) => a.status === "ativo" || a.status === "pendente"
  );
  // prefere o plano ativo; se só houver pedido, mostra "aguardando confirmação"
  const escolhida = minhas.find((a) => a.status === "ativo") ?? minhas[0];
  if (!escolhida) return null;

  // o pagamento não aparece para a cliente
  const [r] = await montarResumos([escolhida], null, hojeSP());
  return {
    status: r.status === "ativo" ? "ativo" : "pendente",
    tecnica: r.tecnica,
    valor: r.valor,
    diasRestantes: r.ciclo?.diasRestantes ?? 0,
    renovacao: r.ciclo?.renovacao ?? null,
    progresso: r.ciclo?.progresso ?? 0,
    usadas: Math.min(r.usadasCiclo, VIP_MANUTENCOES),
    inclusas: VIP_MANUTENCOES,
    designs: VIP_DESIGNS,
    meses: r.meses,
    sugestao: r.sugestao,
    temHorarioMarcado: !!r.proxima,
  };
}
