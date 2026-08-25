import { NextRequest, NextResponse } from "next/server";
import { sendNicEmail } from "@/lib/gmail";
import { buildWelcomeEmail } from "@/lib/emails";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { nome, email } = (await request.json()) as {
      nome?: string | null;
      email?: string;
    };
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }
    const ip = request.headers.get("x-forwarded-for") ?? email;
    if (!rateLimit(`wel:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ success: true });
    }
    await sendNicEmail(email, "Bem-vinda à Nicbeautty!", buildWelcomeEmail(nome ?? null));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("welcome email:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
