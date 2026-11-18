/** Regras da agenda — usadas no site e no servidor. */

/** Horários de início oferecidos para agendamento. */
export const HORARIOS = [
  "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00",
] as const;

/** Hora em que o último atendimento precisa terminar. */
export const FIM_EXPEDIENTE = "19:00";

/** Duração usada quando o serviço não informa o tempo. */
export const DURACAO_PADRAO_MIN = 60;

/** A cliente pode remarcar ou cancelar pelo site até X horas antes do horário. */
export const ANTECEDENCIA_ALTERACAO_HORAS = 24;

/** Momento (ms) em que o atendimento começa, no fuso de São Paulo. */
export function inicioDoAtendimento(dataISO: string, hora: string): number {
  return new Date(`${dataISO}T${hora.slice(0, 5)}:00-03:00`).getTime();
}

/** true se ainda dá tempo de remarcar/cancelar pelo site. */
export function podeAlterarPeloSite(dataISO: string, hora: string, agora: number = Date.now()): boolean {
  return inicioDoAtendimento(dataISO, hora) - agora >= ANTECEDENCIA_ALTERACAO_HORAS * 3600000;
}

/**
 * Situação de cada horário na tela de agendamento:
 * - livre: pode agendar (verde)
 * - ocupado: já reservado, bloqueado ou já passou (cinza)
 * - nao_cabe: o horário está vago, mas o serviço escolhido não termina
 *   antes do próximo compromisso ou do fim do expediente (vermelho claro)
 */
export type SituacaoHorario = "livre" | "ocupado" | "nao_cabe";

export interface HorarioGrade {
  hora: string;
  situacao: SituacaoHorario;
  motivo?: string;
}

export function horaParaMin(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minParaHora(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Converte o texto de duração do catálogo em minutos.
 * Entende "2h", "2h30", "2:30h", "1h 30min", "90 min", "2h a 2:30h"
 * (quando há um intervalo, usa o maior tempo, para não apertar a agenda).
 */
export function parseDuracaoMin(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const t = texto.toLowerCase().replace(",", ".");
  const encontrados: number[] = [];

  const re = /(\d+(?:\.\d+)?)\s*(?:h|:)\s*(\d{1,2})?\s*(?:min|m)?|(\d+)\s*min/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    if (m[3]) encontrados.push(Number(m[3]));
    else {
      const horas = Number(m[1]);
      const minutos = m[2] ? Number(m[2]) : 0;
      encontrados.push(Math.round(horas * 60) + minutos);
    }
  }
  const validos = encontrados.filter((n) => n >= 10 && n <= 600);
  return validos.length ? Math.max(...validos) : null;
}

/** 150 → "2h30" ; 60 → "1h" ; 45 → "45 min" */
export function formatarDuracao(min: number | null | undefined): string {
  if (!min) return "";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h}h${String(r).padStart(2, "0")}` : `${h}h`;
}

/** Duração efetiva de um serviço do catálogo, em minutos. */
export function duracaoDoServico(s: { duracao_min?: number | null; duracao?: string | null } | null | undefined): number {
  if (!s) return DURACAO_PADRAO_MIN;
  if (s.duracao_min && s.duracao_min > 0) return s.duracao_min;
  return parseDuracaoMin(s.duracao) ?? DURACAO_PADRAO_MIN;
}
