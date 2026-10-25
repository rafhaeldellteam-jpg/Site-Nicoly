import { NextResponse } from "next/server";
import { enviarLembretesDeAmanha } from "@/lib/lembretes";

/*
 * Rotina diária chamada pela Vercel às 09h (horário de Brasília) — ver
 * vercel.json → "crons". Envia os lembretes de amanhã e o resumo do dia
 * para o salão.
 *
 * Protegida pela variável CRON_SECRET: a Vercel envia
 * "Authorization: Bearer <CRON_SECRET>" automaticamente.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  try {
    return NextResponse.json(await enviarLembretesDeAmanha());
  } catch (err) {
    console.error("cron lembretes:", err);
    return NextResponse.json({ erro: "Falha ao enviar lembretes" }, { status: 500 });
  }
}
