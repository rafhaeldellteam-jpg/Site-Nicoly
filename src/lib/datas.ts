/** Datas sempre no fuso de São Paulo (o servidor da Vercel roda em UTC). */

const TZ = "America/Sao_Paulo";

/** Data de hoje em São Paulo, no formato YYYY-MM-DD. */
export function hojeSP(offsetDias = 0): string {
  const d = new Date(Date.now() + offsetDias * 86400000);
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Hora atual em São Paulo, no formato HH:MM. */
export function horaAgoraSP(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}
