import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const VALID_ORIGINS = new Set([
  "home_hero",
  "home_contato",
  "catalogo",
  "pos_agendamento",
  "menu_mobile",
  "planos",
  "barra_mobile",
  "novidades",
]);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { origem?: string; utm?: string | null };
    const origem = body.origem ?? "";
    if (!VALID_ORIGINS.has(origem)) {
      return NextResponse.json({ error: "Origem inválida" }, { status: 400 });
    }
    const utm = body.utm ? String(body.utm).replace(/[^\w.-]/g, "").slice(0, 40) || null : null;

    const ip = await clientIp();
    if (!(await rateLimit(`clique:${ip}`, 30, 60 * 1000))) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    const { error } = await supabaseAdmin.from("cliques_whatsapp").insert({
      origem,
      campanha: utm,
    });

    if (error) {
      // tabela ainda não existe — não quebra a UX do visitante
      return NextResponse.json({ ok: false }, { status: 200 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
