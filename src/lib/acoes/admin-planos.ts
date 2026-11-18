"use server";

/** Painel: ganhos dos planos VIP, mensalidades e e-mails personalizados. */

import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { hojeSP } from "@/lib/datas";
import { sendNicEmail } from "@/lib/gmail";
import { buildEmailDoPlano, type TipoEmailPlano } from "@/lib/emails";
import { cicloAtual, somarDiasISO } from "@/lib/planos";
import { buscarAssinaturas, carregarPagamentos, montarResumos, type ResumoPlano } from "@/lib/planos-resumo";
import { dadosDoEmail, registrarAviso } from "@/lib/planos-avisos";

export interface GanhosPlanos {
  hoje: string;
  /** receita recorrente por mês (soma das mensalidades ativas) */
  mrr: number;
  ativos: number;
  pendentes: number;
  recebidoMes: number;
  recebidoMesAnterior: number;
  recebidoTotal: number;
  /** mensalidades do ciclo atual ainda não registradas como pagas */
  emAbertoQtd: number;
  emAbertoValor: number;
  /** renovações nos próximos 7 dias */
  renovam7: { id: number; nome: string; renovacao: string; valor: number }[];
  porMes: { mes: string; valor: number }[];
  ticketMedio: number;
  permanenciaMedia: number;
  cancelados90: number;
  /** manutenções feitas pelas VIP no mês e quanto custariam avulsas */
  atendimentosVipMes: number;
  valorAtendimentosVip: number;
  semTabela: boolean;
}

export interface PainelPlanos {
  ganhos: GanhosPlanos;
  resumos: ResumoPlano[];
}

function somarMeses(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7);
}

export async function adminPainelPlanos(): Promise<PainelPlanos> {
  await requireAdmin();
  const hoje = hojeSP();
  const mesAtual = hoje.slice(0, 7);
  const mesAnterior = somarMeses(mesAtual, -1);
  const [assinaturas, pagamentos] = await Promise.all([buscarAssinaturas(), carregarPagamentos()]);
  const resumos = await montarResumos(assinaturas, pagamentos, hoje);

  const ativos = resumos.filter((r) => r.status === "ativo");
  const mrr = ativos.reduce((t, r) => t + r.valor, 0);
  const lista = pagamentos ?? [];

  // sem a tabela de pagamentos: estima pelos ciclos dos planos ativos
  const estimados = pagamentos
    ? []
    : ativos.flatMap((r) => {
        const refs: { pago_em: string; valor: number }[] = [];
        for (let d = r.inicio ?? hoje; d <= hoje; d = somarDiasISO(d, 30)) refs.push({ pago_em: d, valor: r.valor });
        return refs;
      });
  const recebidos = pagamentos ? lista.map((p) => ({ pago_em: p.pago_em, valor: p.valor })) : estimados;
  const somaMes = (m: string) => recebidos.filter((p) => p.pago_em.startsWith(m)).reduce((t, p) => t + p.valor, 0);

  const porMes = Array.from({ length: 6 }, (_, i) => {
    const mes = somarMeses(mesAtual, i - 5);
    return { mes, valor: somaMes(mes) };
  });

  const emAberto = ativos.filter((r) => r.pagoCiclo === false);
  const em7 = somarDiasISO(hoje, 7);
  const renovam7 = ativos
    .filter((r) => r.ciclo && r.ciclo.renovacao <= em7)
    .map((r) => ({ id: r.id, nome: r.nome, renovacao: r.ciclo!.renovacao, valor: r.valor }))
    .sort((a, b) => a.renovacao.localeCompare(b.renovacao));

  const comTempo = resumos.filter((r) => r.status === "ativo" || r.status === "cancelado");
  const ha90 = somarDiasISO(hoje, -90);

  // manutenções das VIP feitas neste mês (valor que custariam avulsas)
  const inicioMes = `${mesAtual}-01`;
  const { data: agsMes } = await supabaseAdmin
    .from("appointments")
    .select("client_phone, client_email, valor, services(preco)")
    .gte("appointment_date", inicioMes)
    .lte("appointment_date", hoje)
    .eq("status", "concluido")
    .limit(2000);
  const tels = new Set(ativos.map((r) => String(r.whatsapp ?? "").replace(/\D/g, "").slice(-11)).filter((t) => t.length >= 10));
  const emails = new Set(ativos.map((r) => r.email).filter(Boolean));
  let atendimentosVipMes = 0;
  let valorAtendimentosVip = 0;
  for (const g of (agsMes ?? []) as unknown as {
    client_phone: string | null;
    client_email: string | null;
    valor: number | null;
    services: { preco?: number | null } | null;
  }[]) {
    const tel = String(g.client_phone ?? "").replace(/\D/g, "").slice(-11);
    const em = (g.client_email ?? "").trim().toLowerCase();
    if (tels.has(tel) || (em && emails.has(em))) {
      atendimentosVipMes++;
      valorAtendimentosVip += Number(g.valor ?? g.services?.preco ?? 0);
    }
  }

  return {
    resumos,
    ganhos: {
      hoje,
      mrr,
      ativos: ativos.length,
      pendentes: resumos.filter((r) => r.status === "pendente").length,
      recebidoMes: somaMes(mesAtual),
      recebidoMesAnterior: somaMes(mesAnterior),
      recebidoTotal: recebidos.reduce((t, p) => t + p.valor, 0),
      emAbertoQtd: emAberto.length,
      emAbertoValor: emAberto.reduce((t, r) => t + r.valor, 0),
      renovam7,
      porMes,
      ticketMedio: ativos.length ? mrr / ativos.length : 0,
      permanenciaMedia: comTempo.length ? comTempo.reduce((t, r) => t + Math.max(1, r.meses), 0) / comTempo.length : 0,
      cancelados90: resumos.filter((r) => r.status === "cancelado" && (r.canceladoEm ?? "") >= ha90).length,
      atendimentosVipMes,
      valorAtendimentosVip,
      semTabela: pagamentos === null,
    },
  };
}

/** Marca a mensalidade do ciclo atual como paga. */
export async function adminRegistrarPagamento(assinaturaId: number): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  const [a] = await buscarAssinaturas({ id: Number(assinaturaId) });
  if (!a) return { ok: false, erro: "Assinatura não encontrada." };
  const ciclo = cicloAtual(a.inicio, hojeSP());
  const { error } = await supabaseAdmin.from("planos_pagamentos").upsert(
    { assinatura_id: a.id, referencia: ciclo.inicio, valor: Number(a.valor_mensal ?? 180), pago_em: hojeSP() },
    { onConflict: "assinatura_id,referencia" }
  );
  if (error) {
    if (/planos_pagamentos/.test(error.message))
      return { ok: false, erro: "Falta criar a tabela de pagamentos. Rode o SQL 009 no Supabase." };
    return { ok: false, erro: error.message };
  }
  return { ok: true };
}

/** Desfaz o pagamento do ciclo atual (se foi marcado por engano). */
export async function adminDesfazerPagamento(assinaturaId: number): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  const [a] = await buscarAssinaturas({ id: Number(assinaturaId) });
  if (!a) return { ok: false, erro: "Assinatura não encontrada." };
  const ciclo = cicloAtual(a.inicio, hojeSP());
  const { error } = await supabaseAdmin
    .from("planos_pagamentos")
    .delete()
    .match({ assinatura_id: a.id, referencia: ciclo.inicio });
  return error ? { ok: false, erro: error.message } : { ok: true };
}

const TIPOS: TipoEmailPlano[] = ["resumo", "renovacao", "manutencao"];

async function montarEmail(assinaturaId: number, tipo: TipoEmailPlano, mensagem: string) {
  if (!TIPOS.includes(tipo)) return { erro: "Tipo de e-mail inválido." } as const;
  const assinaturas = await buscarAssinaturas({ id: Number(assinaturaId) });
  if (!assinaturas.length) return { erro: "Assinatura não encontrada." } as const;
  const [r] = await montarResumos(assinaturas, await carregarPagamentos());
  if (r.status !== "ativo") return { erro: "Só dá para enviar para planos ativos." } as const;
  const { assunto, html } = buildEmailDoPlano(tipo, dadosDoEmail(r, String(mensagem ?? "").slice(0, 800)));
  return { r, assunto, html } as const;
}

export async function adminPreviaEmailPlano(
  assinaturaId: number,
  tipo: TipoEmailPlano,
  mensagem: string
): Promise<{ ok: boolean; erro?: string; assunto?: string; html?: string; para?: string | null }> {
  await requireAdmin();
  const m = await montarEmail(assinaturaId, tipo, mensagem);
  if ("erro" in m) return { ok: false, erro: m.erro };
  return { ok: true, assunto: m.assunto, html: m.html, para: m.r.email };
}

export async function adminEnviarEmailPlano(
  assinaturaId: number,
  tipo: TipoEmailPlano,
  mensagem: string
): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  const m = await montarEmail(assinaturaId, tipo, mensagem);
  if ("erro" in m) return { ok: false, erro: m.erro };
  if (!m.r.email) return { ok: false, erro: "Esta cliente não tem e-mail cadastrado. Edite a assinatura." };
  try {
    await sendNicEmail(m.r.email, m.assunto, m.html);
  } catch {
    return { ok: false, erro: "Não foi possível enviar o e-mail agora." };
  }
  // conta como aviso já enviado, para a rotina automática não repetir no mesmo dia
  if (m.r.ciclo) {
    const chave = tipo === "renovacao" ? m.r.ciclo.renovacao : tipo === "manutencao" ? (m.r.ultima?.data ?? m.r.ciclo.inicio) : hojeSP();
    await registrarAviso(m.r.id, tipo, chave);
  }
  return { ok: true };
}

