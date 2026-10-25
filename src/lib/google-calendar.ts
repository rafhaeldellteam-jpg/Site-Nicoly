import { google } from "googleapis";

/*
 * Integração com o Google Agenda da Nicbeautty (conta de serviço).
 * Sem as variáveis GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY,
 * tudo aqui vira "não faz nada" e o site continua funcionando.
 */

const calendarId = () => process.env.GOOGLE_CALENDAR_ID ?? "nicbeautty@gmail.com";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) return null;
  return new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key.replace(/\\n/g, "\n") },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
}

function agenda() {
  const auth = getAuth();
  return auth ? google.calendar({ version: "v3", auth }) : null;
}

export function calendarConfigurado(): boolean {
  return !!getAuth();
}

function intervalo(date: string, time: string, durationMinutes: number) {
  const ini = new Date(`${date}T${time}:00-03:00`);
  const fim = new Date(ini.getTime() + durationMinutes * 60 * 1000);
  return {
    start: { dateTime: ini.toISOString(), timeZone: "America/Sao_Paulo" },
    end: { dateTime: fim.toISOString(), timeZone: "America/Sao_Paulo" },
  };
}

/** Compromissos do dia (para marcar horários como ocupados). */
export async function getBusySlots(dateISO: string): Promise<{ id: string; start: string; end: string }[]> {
  const cal = agenda();
  if (!cal) return [];
  try {
    const res = await cal.events.list({
      calendarId: calendarId(),
      timeMin: new Date(`${dateISO}T00:00:00-03:00`).toISOString(),
      timeMax: new Date(`${dateISO}T23:59:59-03:00`).toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });
    return (res.data.items ?? [])
      .filter((e) => e.status !== "cancelled" && e.transparency !== "transparent")
      .map((e) => ({ id: e.id ?? "", start: e.start?.dateTime || "", end: e.end?.dateTime || "" }))
      .filter((b) => b.start && b.end);
  } catch (err) {
    console.error("getBusySlots:", err);
    return [];
  }
}

/** Cria o compromisso e devolve o id do evento (para remarcar/cancelar depois). */
export async function createCalendarEvent(ev: {
  summary: string;
  description: string;
  date: string;
  time: string;
  durationMinutes: number;
}): Promise<string | null> {
  const cal = agenda();
  if (!cal) {
    console.error("Google Agenda não configurado (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY)");
    return null;
  }
  try {
    const res = await cal.events.insert({
      calendarId: calendarId(),
      requestBody: { summary: ev.summary, description: ev.description, ...intervalo(ev.date, ev.time, ev.durationMinutes) },
    });
    return res.data.id ?? null;
  } catch (err) {
    console.error("createCalendarEvent:", err);
    return null;
  }
}

/** Move um compromisso para outro dia/horário. */
export async function moveCalendarEvent(
  eventId: string,
  ev: { date: string; time: string; durationMinutes: number; summary?: string }
): Promise<boolean> {
  const cal = agenda();
  if (!cal || !eventId) return false;
  try {
    await cal.events.patch({
      calendarId: calendarId(),
      eventId,
      requestBody: { ...intervalo(ev.date, ev.time, ev.durationMinutes), ...(ev.summary ? { summary: ev.summary } : {}) },
    });
    return true;
  } catch (err) {
    console.error("moveCalendarEvent:", err);
    return false;
  }
}

/** Apaga um compromisso (horário cancelado volta a ficar livre). */
export async function deleteCalendarEvent(eventId: string | null | undefined): Promise<boolean> {
  const cal = agenda();
  if (!cal || !eventId) return false;
  try {
    await cal.events.delete({ calendarId: calendarId(), eventId });
    return true;
  } catch (err) {
    // já apagado à mão na agenda: tudo bem
    const status = (err as { code?: number })?.code;
    if (status === 404 || status === 410) return true;
    console.error("deleteCalendarEvent:", err);
    return false;
  }
}
