/** Regras do Plano VIP — usadas no servidor e no painel. */

export const VIP_VALOR_PADRAO = 180;
export const VIP_CICLO_DIAS = 30;

/** Próxima renovação de um plano que começou em `inicio` (YYYY-MM-DD). */
export function proximaRenovacao(
  inicio: string | null,
  hoje: Date = new Date()
): { data: Date; diasRestantes: number; ciclo: number } {
  const base = inicio ? new Date(`${inicio}T12:00:00`) : new Date(hoje);
  const ciclo = VIP_CICLO_DIAS * 86400000;
  let n = Math.max(0, Math.floor((hoje.getTime() - base.getTime()) / ciclo));
  let renovacao = new Date(base.getTime() + (n + 1) * ciclo);
  if (renovacao < hoje) {
    n += 1;
    renovacao = new Date(base.getTime() + (n + 1) * ciclo);
  }
  const diasRestantes = Math.max(0, Math.ceil((renovacao.getTime() - hoje.getTime()) / 86400000));
  return { data: renovacao, diasRestantes, ciclo: n };
}
