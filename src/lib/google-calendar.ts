import { google } from "googleapis";

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

export function calendarConfigurado(): boolean {
  return !!getAuth();
}

export async function getBusySlots(dateISO: string): Promise<{ start: string; end: string }[]> {
  const auth = getAuth();
  if (!auth) return [];
  try {
    const calendar = google.calendar({ version: "v3", auth });
    const res = await calendar.events.list({
      calendarId: calendarId(),
      timeMin: new Date(`${dateISO}T00:00:00-03:00`).toISOString(),
      timeMax: new Date(`${dateISO}T23:59:59-03:00`).toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });
    return (
      res.data.items?.map((e) => ({
        start: e.start?.dateTime || "",
        end: e.end?.dateTime || "",
      })) ?? []
    ).filter((b) => b.start && b.end);
  } catch (err) {
    console.error("getBusySlots:", err);
    return [];
  }
}

export async function createCalendarEvent(ev: {
  summary: string;
  description: string;
  date: string;
  time: string;
  durationMinutes: number;
}): Promise<boolean> {
  const auth = getAuth();
  if (!auth) {
    console.error("Google Calendar não configurado (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY)");
    return false;
  }
  try {
    const calendar = google.calendar({ version: "v3", auth });
    const startDateTime = new Date(`${ev.date}T${ev.time}:00-03:00`);
    const endDateTime = new Date(startDateTime.getTime() + ev.durationMinutes * 60 * 1000);
    await calendar.events.insert({
      calendarId: calendarId(),
      requestBody: {
        summary: ev.summary,
        description: ev.description,
        start: { dateTime: startDateTime.toISOString(), timeZone: "America/Sao_Paulo" },
        end: { dateTime: endDateTime.toISOString(), timeZone: "America/Sao_Paulo" },
      },
    });
    return true;
  } catch (err) {
    console.error("createCalendarEvent:", err);
    return false;
  }
}
