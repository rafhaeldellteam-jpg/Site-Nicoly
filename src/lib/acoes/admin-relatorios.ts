"use server";

/** Painel: financeiro (o que entrou e o que vai entrar) e cliques no WhatsApp. */

import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { hojeSP } from "@/lib/datas";

/* ================= FINANCEIRO ================= */

export interface MesFinanceiro {
  mes: string; // YYYY-MM
  recebido: number; // atendimentos concluídos
  agendado: number; // atendimentos confirmados ainda não concluídos
}

export interface Financeiro {
  hoje: string;
  recebidoMes: number;
  atendimentosMes: number;
  agendadoRestanteMes: number;
  proximos30Agendado: number;
  proximos30Qtd: number;
  vipMensal: number;
  vipAtivos: number;
  vipInclusos30: number; // atendimentos de clientes VIP (já pagos no plano)
  paraFecharQtd: number;
  paraFecharValor: number;
  ticketMedio90: number;
  meses: MesFinanceiro[];
  porServico: { nome: string; valor: number; qtd: number }[];
  semPreco: number; // atendimentos sem preço cadastrado (ficam fora das somas)
}

type LinhaAg = {
  appointment_date: string;
  status: string | null;
  client_phone: string | null;
  client_email: string | null;
  valor?: number | null;
  services?: { nome?: string; preco?: number | null } | null;
};

function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function somarMeses(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

const soDigitos = (t: string | null | undefined) => String(t ?? "").replace(/\D/g, "").slice(-11);

export async function adminFinanceiro(): Promise<Financeiro> {
  await requireAdmin();
  const hoje = hojeSP();
  const mesAtual = hoje.slice(0, 7);
  const primeiroMes = somarMeses(mesAtual, -5);
  const ultimoMes = somarMeses(mesAtual, 1);
  const limite = `${somarMeses(ultimoMes, 1)}-01`;

  const [agRes, vipRes] = await Promise.all([
    supabaseAdmin
      .from("appointments")
      .select("*, services(nome, preco)")
      .gte("appointment_date", `${primeiroMes}-01`)
      .lt("appointment_date", limite)
      .neq("status", "cancelado")
      .limit(5000),
    supabaseAdmin.from("planos_assinaturas").select("*").eq("status", "ativo"),
  ]);

  const vips = (vipRes.data ?? []) as { cliente_whatsapp?: string | null; cliente_email?: string | null; valor_mensal?: number | null }[];
  const telefonesVip = new Set(vips.map((v) => soDigitos(v.cliente_whatsapp)).filter((t) => t.length >= 10));
  const emailsVip = new Set(vips.map((v) => (v.cliente_email ?? "").trim().toLowerCase()).filter(Boolean));
  const ehVip = (a: LinhaAg) =>
    telefonesVip.has(soDigitos(a.client_phone)) || (!!a.client_email && emailsVip.has(a.client_email.trim().toLowerCase()));

  const meses = new Map<string, MesFinanceiro>();
  for (let i = 0; i < 7; i++) {
    const m = somarMeses(primeiroMes, i);
    meses.set(m, { mes: m, recebido: 0, agendado: 0 });
  }

  const em30 = somarDias(hoje, 30);
  const ha90 = somarDias(hoje, -90);
  const servicos = new Map<string, { nome: string; valor: number; qtd: number }>();
  const r: Omit<Financeiro, "meses" | "porServico"> = {
    hoje,
    recebidoMes: 0,
    atendimentosMes: 0,
    agendadoRestanteMes: 0,
    proximos30Agendado: 0,
    proximos30Qtd: 0,
    vipMensal: vips.reduce((t, v) => t + Number(v.valor_mensal ?? 0), 0),
    vipAtivos: vips.length,
    vipInclusos30: 0,
    paraFecharQtd: 0,
    paraFecharValor: 0,
    ticketMedio90: 0,
    semPreco: 0,
  };
  let recebido90 = 0;
  let qtd90 = 0;

  for (const a of (agRes.data ?? []) as LinhaAg[]) {
    const concluido = a.status === "concluido";
    const data = a.appointment_date;
    const vip = ehVip(a);
    const preco = a.valor ?? a.services?.preco ?? null;
    if (preco === null && !vip) r.semPreco++;
    // atendimento de cliente VIP já está pago na mensalidade
    const valor = vip ? 0 : Number(preco ?? 0);

    const mes = meses.get(data.slice(0, 7));
    if (mes) {
      if (concluido) mes.recebido += valor;
      else mes.agendado += valor;
    }

    if (concluido && data.startsWith(mesAtual)) {
      r.recebidoMes += valor;
      r.atendimentosMes++;
    }
    if (!concluido && data >= hoje && data.startsWith(mesAtual)) r.agendadoRestanteMes += valor;
    if (!concluido && data >= hoje && data <= em30) {
      r.proximos30Qtd++;
      if (vip) r.vipInclusos30++;
      else r.proximos30Agendado += valor;
    }
    if (!concluido && data < hoje) {
      r.paraFecharQtd++;
      r.paraFecharValor += valor;
    }
    if (concluido && data >= ha90 && !vip && preco !== null) {
      recebido90 += valor;
      qtd90++;
      const nome = a.services?.nome ?? "Outro";
      const s = servicos.get(nome) ?? { nome, valor: 0, qtd: 0 };
      s.valor += valor;
      s.qtd++;
      servicos.set(nome, s);
    }
  }
  r.ticketMedio90 = qtd90 ? recebido90 / qtd90 : 0;

  return {
    ...r,
    meses: [...meses.values()],
    porServico: [...servicos.values()].sort((a, b) => b.valor - a.valor).slice(0, 6),
  };
}

/* ================= CLIQUES NO WHATSAPP ================= */

export interface Cliques {
  dias: { data: string; total: number }[];
  total: number;
  totalAnterior: number;
  porOrigem: { origem: string; total: number }[];
  porCampanha: { campanha: string; total: number }[];
  semTabela: boolean;
}

const fmtDiaSP = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export async function adminCliquesWhatsapp(periodo: number = 30): Promise<Cliques> {
  await requireAdmin();
  const dias = [7, 30, 90].includes(Number(periodo)) ? Number(periodo) : 30;
  const hoje = hojeSP();
  const inicio = somarDias(hoje, -(dias - 1));
  const inicioAnterior = somarDias(inicio, -dias);

  const { data, error } = await supabaseAdmin
    .from("cliques_whatsapp")
    .select("origem, campanha, criado_em")
    .gte("criado_em", new Date(`${inicioAnterior}T00:00:00-03:00`).toISOString())
    .order("criado_em", { ascending: true })
    .limit(20000);
  if (error) return { dias: [], total: 0, totalAnterior: 0, porOrigem: [], porCampanha: [], semTabela: true };

  const porDia = new Map<string, number>();
  for (let i = 0; i < dias; i++) porDia.set(somarDias(inicio, i), 0);
  const origens = new Map<string, number>();
  const campanhas = new Map<string, number>();
  let total = 0;
  let totalAnterior = 0;

  for (const c of (data ?? []) as { origem: string; campanha: string | null; criado_em: string }[]) {
    const dia = fmtDiaSP.format(new Date(c.criado_em));
    if (dia < inicio) {
      totalAnterior++;
      continue;
    }
    total++;
    porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
    origens.set(c.origem, (origens.get(c.origem) ?? 0) + 1);
    const camp = c.campanha?.trim() || "direto";
    campanhas.set(camp, (campanhas.get(camp) ?? 0) + 1);
  }

  const ordenar = <K extends string>(m: Map<string, number>, chave: K) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ [chave]: k, total: v }) as Record<K, string> & { total: number });

  return {
    dias: [...porDia.entries()].map(([d, t]) => ({ data: d, total: t })),
    total,
    totalAnterior,
    porOrigem: ordenar(origens, "origem"),
    porCampanha: ordenar(campanhas, "campanha").slice(0, 8),
    semTabela: false,
  };
}
