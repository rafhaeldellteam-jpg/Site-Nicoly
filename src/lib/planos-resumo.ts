import { supabaseAdmin } from "@/lib/supabase";
import { hojeSP } from "@/lib/datas";
import {
  VIP_VALOR_PADRAO,
  cicloAtual,
  mesesNoPlano,
  sugestaoManutencao,
  type Ciclo,
} from "@/lib/planos";

/*
 * Situação de cada assinatura VIP, calculada no servidor:
 * ciclo atual, manutenções usadas, próxima sessão, mensalidade paga etc.
 * Usado pelo painel, pelos e-mails do plano e pela área "Meus horários".
 * Os atendimentos da cliente são achados pelo WhatsApp ou pelo e-mail.
 */

export const soDigitos = (t: string | null | undefined) => String(t ?? "").replace(/\D/g, "").slice(-11);

export type AssinaturaLinha = {
  id: number;
  cliente_nome: string;
  cliente_whatsapp: string | null;
  cliente_email?: string | null;
  tecnica: string | null;
  valor_mensal: number | null;
  inicio: string | null;
  status: string | null;
  criado_em?: string | null;
  cancelado_em?: string | null;
};

export type Pagamento = { id: number; assinatura_id: number; referencia: string; valor: number; pago_em: string };

export interface Sessao {
  data: string;
  horario: string;
  servico: string;
  status: string;
}

export interface ResumoPlano {
  id: number;
  nome: string;
  email: string | null;
  whatsapp: string | null;
  tecnica: string | null;
  valor: number;
  status: string;
  inicio: string | null;
  canceladoEm: string | null;
  /** só para planos ativos */
  ciclo: Ciclo | null;
  /** horários (feitos ou marcados) dentro do ciclo atual */
  usadasCiclo: number;
  proxima: Sessao | null;
  ultima: Sessao | null;
  /** data sugerida para marcar a próxima manutenção (quando não há horário marcado) */
  sugestao: string | null;
  /** null = tabela de pagamentos ainda não criada */
  pagoCiclo: boolean | null;
  totalPago: number;
  meses: number;
  /** atendimentos concluídos desde o início do plano e quanto custariam avulsos */
  atendimentos: number;
  valorAtendimentos: number;
}

type LinhaAg = {
  appointment_date: string;
  appointment_time: string;
  status: string | null;
  client_phone: string | null;
  client_email: string | null;
  valor?: number | null;
  services?: { nome?: string; preco?: number | null } | null;
};

export async function carregarPagamentos(): Promise<Pagamento[] | null> {
  const { data, error } = await supabaseAdmin
    .from("planos_pagamentos")
    .select("id, assinatura_id, referencia, valor, pago_em")
    .order("pago_em", { ascending: true })
    .limit(5000);
  if (error) return null;
  return ((data ?? []) as Pagamento[]).map((p) => ({ ...p, valor: Number(p.valor) }));
}

/** Monta o resumo das assinaturas informadas (todas, se não passar nenhuma). */
export async function montarResumos(
  assinaturas: AssinaturaLinha[],
  pagamentos: Pagamento[] | null,
  hoje: string = hojeSP()
): Promise<ResumoPlano[]> {
  if (assinaturas.length === 0) return [];

  const inicios = assinaturas.map((a) => a.inicio).filter((d): d is string => !!d).sort();
  const desde = inicios[0] ?? hoje;
  const { data } = await supabaseAdmin
    .from("appointments")
    .select("appointment_date, appointment_time, status, client_phone, client_email, valor, services(nome, preco)")
    .gte("appointment_date", desde)
    .neq("status", "cancelado")
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true })
    .limit(5000);
  const ags = (data ?? []) as unknown as LinhaAg[];

  return assinaturas.map((a) => {
    const tel = soDigitos(a.cliente_whatsapp);
    const email = (a.cliente_email ?? "").trim().toLowerCase();
    const inicio = a.inicio ?? hoje;
    const dela = ags.filter(
      (g) =>
        g.appointment_date >= inicio &&
        ((tel.length >= 10 && soDigitos(g.client_phone) === tel) ||
          (!!email && (g.client_email ?? "").trim().toLowerCase() === email))
    );
    const sessao = (g: LinhaAg): Sessao => ({
      data: g.appointment_date,
      horario: g.appointment_time.slice(0, 5),
      servico: g.services?.nome ?? "Atendimento",
      status: g.status ?? "confirmado",
    });

    const ativo = a.status === "ativo";
    const ciclo = ativo ? cicloAtual(a.inicio, hoje) : null;
    const futuras = dela.filter((g) => g.appointment_date >= hoje && g.status !== "concluido");
    const passadas = dela.filter((g) => g.appointment_date < hoje || g.status === "concluido");
    const concluidas = dela.filter((g) => g.status === "concluido");
    const ultima = passadas.length ? sessao(passadas[passadas.length - 1]) : null;
    const proxima = futuras.length ? sessao(futuras[0]) : null;
    const usadasCiclo = ciclo
      ? dela.filter((g) => g.appointment_date >= ciclo.inicio && g.appointment_date < ciclo.renovacao).length
      : 0;

    const meusPagamentos = pagamentos?.filter((p) => p.assinatura_id === a.id) ?? [];
    return {
      id: a.id,
      nome: a.cliente_nome,
      email: email || null,
      whatsapp: a.cliente_whatsapp,
      tecnica: a.tecnica,
      valor: Number(a.valor_mensal ?? VIP_VALOR_PADRAO),
      status: a.status ?? "ativo",
      inicio: a.inicio,
      canceladoEm: a.cancelado_em ?? null,
      ciclo,
      usadasCiclo,
      proxima,
      ultima,
      sugestao: ativo && !proxima ? sugestaoManutencao(ultima?.data ?? null, hoje) : null,
      pagoCiclo: pagamentos === null || !ciclo ? null : meusPagamentos.some((p) => p.referencia === ciclo.inicio),
      totalPago: meusPagamentos.reduce((t, p) => t + p.valor, 0),
      meses: mesesNoPlano(a.inicio, a.cancelado_em ?? hoje) + (ativo ? 1 : 0),
      atendimentos: concluidas.length,
      valorAtendimentos: concluidas.reduce((t, g) => t + Number(g.valor ?? g.services?.preco ?? 0), 0),
    };
  });
}

export async function buscarAssinaturas(filtro?: { id?: number; email?: string }): Promise<AssinaturaLinha[]> {
  let q = supabaseAdmin.from("planos_assinaturas").select("*");
  if (filtro?.id) q = q.eq("id", filtro.id);
  if (filtro?.email) q = q.ilike("cliente_email", filtro.email);
  const { data, error } = await q.order("inicio", { ascending: false }).limit(1000);
  if (error) return [];
  return (data ?? []) as AssinaturaLinha[];
}
