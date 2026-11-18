import { NextResponse } from "next/server";
import { enviarLembretesDeAmanha } from "@/lib/lembretes";
import { enviarAvisosDosPlanos } from "@/lib/planos-avisos";

/*
 * Rotina diária chamada pela Vercel às 09h (horário de Brasília) — ver
 * vercel.json → "crons". Envia os lembretes de amanhã, o resumo do dia
 * para o salão e os e-mails automáticos do Plano VIP (renovação e
 * hora da manutenção).
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
  const resposta: Record<string, unknown> = {};
  let falhou = false;
  try {
    resposta.agendamentos = await enviarLembretesDeAmanha();
  } catch (err) {
    falhou = true;
    console.error("cron lembretes:", err);
  }
  try {
    resposta.planos = await enviarAvisosDosPlanos();
  } catch (err) {
    falhou = true;
    console.error("cron avisos dos planos:", err);
  }
  return NextResponse.json(resposta, { status: falhou ? 500 : 200 });
}
