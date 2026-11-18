/** Regras do Plano VIP — usadas no servidor, no painel e na área da cliente. */

export const VIP_VALOR_PADRAO = 180;
export const VIP_CICLO_DIAS = 30;
/** O que o VIP inclui em cada ciclo de 30 dias (igual à página /planos). */
export const VIP_MANUTENCOES = 3;
export const VIP_DESIGNS = 2;
/** Intervalo recomendado entre manutenções de cílios. */
export const INTERVALO_MANUTENCAO_DIAS = 15;

const DIA = 86400000;

/** Data YYYY-MM-DD → Date ao meio-dia (evita pular de dia por fuso). */
export function dataISO(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

/** Date → YYYY-MM-DD (usando o dia "local" do meio-dia). */
export function paraISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function somarDiasISO(iso: string, dias: number): string {
  return paraISO(new Date(dataISO(iso).getTime() + dias * DIA));
}

export function diasEntre(deISO: string, ateISO: string): number {
  return Math.round((dataISO(ateISO).getTime() - dataISO(deISO).getTime()) / DIA);
}

export interface Ciclo {
  /** número do ciclo (0 = primeiro mês) */
  numero: number;
  /** primeiro dia do ciclo atual (YYYY-MM-DD) */
  inicio: string;
  /** dia da renovação = primeiro dia do próximo ciclo (YYYY-MM-DD) */
  renovacao: string;
  diasRestantes: number;
  /** 0 a 1 — quanto do ciclo já passou */
  progresso: number;
}

/** Ciclo atual de um plano que começou em `inicio`, visto no dia `hojeISO`. */
export function cicloAtual(inicio: string | null, hojeISO: string): Ciclo {
  const base = inicio && /^\d{4}-\d{2}-\d{2}$/.test(inicio) ? inicio : hojeISO;
  const passados = Math.max(0, diasEntre(base, hojeISO));
  const numero = Math.floor(passados / VIP_CICLO_DIAS);
  const ini = somarDiasISO(base, numero * VIP_CICLO_DIAS);
  const renovacao = somarDiasISO(ini, VIP_CICLO_DIAS);
  const diasRestantes = Math.max(0, diasEntre(hojeISO, renovacao));
  return {
    numero,
    inicio: ini,
    renovacao,
    diasRestantes,
    progresso: Math.min(1, Math.max(0, (VIP_CICLO_DIAS - diasRestantes) / VIP_CICLO_DIAS)),
  };
}

/** Próxima renovação (formato antigo, usado por telas existentes). */
export function proximaRenovacao(
  inicio: string | null,
  hoje: Date = new Date()
): { data: Date; diasRestantes: number; ciclo: number } {
  const c = cicloAtual(inicio, paraISO(hoje));
  return { data: dataISO(c.renovacao), diasRestantes: c.diasRestantes, ciclo: c.numero };
}

/** Data sugerida para a próxima manutenção, a partir da última sessão. */
export function sugestaoManutencao(ultimaISO: string | null, hojeISO: string): string {
  if (!ultimaISO) return hojeISO;
  const sugerida = somarDiasISO(ultimaISO, INTERVALO_MANUTENCAO_DIAS);
  return sugerida < hojeISO ? hojeISO : sugerida;
}

/** Quantos meses (ciclos) completos a cliente está no plano. */
export function mesesNoPlano(inicio: string | null, ateISO: string): number {
  if (!inicio) return 0;
  return Math.max(0, Math.floor(diasEntre(inicio, ateISO) / VIP_CICLO_DIAS));
}

export const DIAS_AVISO_RENOVACAO = 5;

/**
 * Qual e-mail automático a cliente deveria receber hoje — e a "chave" que
 * impede de mandar o mesmo aviso duas vezes. null = nenhum.
 */
export function avisoDevido(
  r: {
    status: string;
    email: string | null;
    ciclo: Ciclo | null;
    usadasCiclo: number;
    proxima: unknown | null;
    ultima: { data: string } | null;
  },
  hoje: string
): { tipo: "renovacao" | "manutencao"; chave: string } | null {
  if (r.status !== "ativo" || !r.email || !r.ciclo) return null;
  if (r.ciclo.diasRestantes >= 1 && r.ciclo.diasRestantes <= DIAS_AVISO_RENOVACAO)
    return { tipo: "renovacao", chave: r.ciclo.renovacao };
  if (!r.proxima && r.usadasCiclo < VIP_MANUTENCOES) {
    const desde = r.ultima ? diasEntre(r.ultima.data, hoje) : diasEntre(r.ciclo.inicio, hoje);
    const limite = r.ultima ? INTERVALO_MANUTENCAO_DIAS - 1 : 3;
    if (desde >= limite) return { tipo: "manutencao", chave: r.ultima?.data ?? r.ciclo.inicio };
  }
  return null;
}
