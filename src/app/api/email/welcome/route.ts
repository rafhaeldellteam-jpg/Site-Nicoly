import { NextRequest, NextResponse } from "next/server";
import { sendNicEmail } from "@/lib/gmail";
import { buildWelcomeEmail } from "@/lib/emails";
import { rateLimit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Envia o e-mail de boas-vindas para a própria cliente que acabou de entrar.
 *
 * O destinatário vem do token de login (verificado pelo Supabase), nunca do
 * corpo da requisição — assim ninguém consegue usar o Gmail do salão para
 * mandar mensagens a terceiros.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    const user = data.user;
    if (error || !user?.email) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    // só manda para contas criadas há pouco tempo (evita reenvios repetidos)
    const criadaEm = new Date(user.created_at ?? 0).getTime();
    if (Date.now() - criadaEm > 24 * 60 * 60 * 1000) return NextResponse.json({ success: true });

    if (!(await rateLimit(`wel:${user.id}`, 1, 24 * 60 * 60 * 1000))) {
      return NextResponse.json({ success: true });
    }

    const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
    const nome = meta.nome ?? meta.full_name ?? meta.name ?? null;
    await sendNicEmail(user.email, "Bem-vinda à Nicbeautty!", buildWelcomeEmail(nome));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("welcome email:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
