"use server";

/** Plano VIP: pedidos pelo site e gestão das assinaturas no painel. */

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/admin-auth";
import { hojeSP } from "@/lib/datas";
import { createCalendarEvent } from "@/lib/google-calendar";
import { ERRO_CAPTCHA, verificarCaptcha } from "@/lib/captcha";
import { sendNicEmail } from "@/lib/gmail";
import { buildPlanActivatedEmail, buildReminderEmail, buildAssinaturaSalonEmail } from "@/lib/emails";
import { proximaRenovacao, VIP_VALOR_PADRAO } from "@/lib/planos";
import { emailDoSalao, validarEmail, validarTelefone } from "@/lib/servidor";
import type { Assinatura } from "@/lib/types";

export async function adminGetAssinaturas(): Promise<Assinatura[]> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("planos_assinaturas")
    .select("*")
    .order("status", { ascending: true })
    .order("inicio", { ascending: false })
    .order("id", { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function adminSaveAssinatura(
  a: Assinatura
): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  if (!a.cliente_nome?.trim()) return { ok: false, erro: "Nome do cliente obrigatório." };
  const registro = {
    ...(a.id ? { id: a.id } : {}),
    cliente_nome: a.cliente_nome.trim(),
    cliente_whatsapp: a.cliente_whatsapp?.trim() || null,
    tecnica: a.tecnica?.trim() || null,
    valor_mensal: a.valor_mensal ?? VIP_VALOR_PADRAO,
    inicio: a.inicio || hojeSP(),
    status: a.status || "ativo",
  };
  const emailCliente = a.cliente_email?.trim() || null;

  let { error } = await supabaseAdmin
    .from("planos_assinaturas")
    .upsert({ ...registro, ...(emailCliente ? { cliente_email: emailCliente } : {}) }, { onConflict: "id" });
  if (error && /cliente_email/i.test(error.message)) {
    // coluna ainda não existe no banco — salva sem o e-mail
    ({ error } = await supabaseAdmin
      .from("planos_assinaturas")
      .upsert(registro, { onConflict: "id" }));
  }
  if (error) return { ok: false, erro: error.message };

  if (!a.id && (a.status || "ativo") === "ativo") {
    const assinaturaData = {
      nome: registro.cliente_nome,
      whatsapp: registro.cliente_whatsapp ?? "-",
      email: emailCliente,
      tecnica: registro.tecnica,
      valorMensal: registro.valor_mensal ?? VIP_VALOR_PADRAO,
      inicio: registro.inicio,
    };

    after(async () => {
      try {
        await createCalendarEvent({
          summary: `Plano VIP — ${registro.cliente_nome}`,
          description: `Plano VIP Nicbeautty\nCliente: ${registro.cliente_nome}\nWhatsApp: ${registro.cliente_whatsapp ?? "-"}\nTécnica: ${registro.tecnica ?? "-"}\nValor mensal: R$ ${registro.valor_mensal}`,
          date: registro.inicio,
          time: "09:00",
          durationMinutes: 30,
        });
      } catch (err) {
        console.error("Google Agenda (assinatura admin):", err);
      }
      try {
        await sendNicEmail(
          emailDoSalao(),
          `Nova assinatura VIP: ${registro.cliente_nome}`,
          buildAssinaturaSalonEmail(assinaturaData)
        );
      } catch (err) {
        console.error("E-mail salão (assinatura admin):", err);
      }
      if (emailCliente) {
        try {
          await sendNicEmail(
            emailCliente,
            "Seu Plano VIP Nicbeautty foi ativado!",
            buildPlanActivatedEmail({
              nome: registro.cliente_nome,
              tecnica: registro.tecnica,
              valorMensal: registro.valor_mensal ?? VIP_VALOR_PADRAO,
              inicio: registro.inicio,
            })
          );
        } catch (err) {
          console.error("E-mail cliente (assinatura admin):", err);
        }
      }
    });
  }
  return { ok: true };
}

export async function adminSetAssinaturaStatus(
  id: number,
  status: string
): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  if (!["pendente", "ativo", "pausado", "cancelado"].includes(status))
    return { ok: false, erro: "Status inválido." };

  const { data: anterior } = await supabaseAdmin
    .from("planos_assinaturas")
    .select("*")
    .eq("id", id)
    .single();

  const { error } = await supabaseAdmin
    .from("planos_assinaturas")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };

  // plano feito pelo site e confirmado agora pela Nicoly → avisa a cliente
  const row = (anterior ?? null) as Record<string, unknown> | null;
  const emailCliente = (row?.cliente_email as string | null | undefined)?.trim();
  if (row && row.status === "pendente" && status === "ativo" && emailCliente) {
    after(async () => {
      try {
        await sendNicEmail(
          emailCliente,
          "Seu Plano VIP Nicbeautty foi ativado!",
          buildPlanActivatedEmail({
            nome: String(row.cliente_nome ?? ""),
            tecnica: (row.tecnica as string | null) ?? null,
            valorMensal: Number(row.valor_mensal ?? VIP_VALOR_PADRAO),
            inicio: String(row.inicio ?? hojeSP()),
          })
        );
      } catch (err) {
        console.error("E-mail cliente (ativação de plano):", err);
      }
    });
  }
  return { ok: true };
}

export async function adminDeleteAssinatura(id: number): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("planos_assinaturas").delete().eq("id", id);
  return error ? { ok: false, erro: error.message } : { ok: true };
}

export async function createAssinaturaPublic(input: {
  nome: string;
  whatsapp: string;
  email?: string;
  tecnica?: string;
  captcha?: string;
}): Promise<{ ok: boolean; erro?: string }> {
  const ip = await clientIp();
  if (!(await rateLimit(`plano:${ip}`, 3, 30 * 60 * 1000)))
    return { ok: false, erro: "Muitas tentativas. Aguarde alguns minutos." };
  if (!(await verificarCaptcha(input.captcha, ip))) return { ok: false, erro: ERRO_CAPTCHA };

  const nome = String(input.nome ?? "").trim();
  const whatsapp = String(input.whatsapp ?? "").trim();
  const email = String(input.email ?? "").trim().toLowerCase() || null;
  const tecnica = String(input.tecnica ?? "").trim().slice(0, 60) || null;
  if (nome.length < 3 || nome.length > 80) return { ok: false, erro: "Nome inválido." };
  if (!validarTelefone(whatsapp)) return { ok: false, erro: "WhatsApp inválido." };
  if (email && !validarEmail(email)) return { ok: false, erro: "E-mail inválido." };

  const registro = {
    cliente_nome: nome,
    cliente_whatsapp: whatsapp,
    tecnica,
    valor_mensal: VIP_VALOR_PADRAO,
    inicio: hojeSP(),
    // fica pendente até a Nicoly confirmar o pagamento no painel
    status: "pendente",
  };

  let { error } = await supabaseAdmin
    .from("planos_assinaturas")
    .insert({ ...registro, ...(email ? { cliente_email: email } : {}) });
  if (error && /cliente_email/i.test(error.message)) {
    ({ error } = await supabaseAdmin.from("planos_assinaturas").insert(registro));
  }
  if (error) return { ok: false, erro: "Erro ao enviar o pedido. Tente novamente." };

  after(async () => {
    try {
      await createCalendarEvent({
        summary: `Pedido de Plano VIP — ${nome} (site)`,
        description: `Pedido de Plano VIP feito pelo site (aguardando confirmação).\nCliente: ${nome}\nWhatsApp: ${whatsapp}\nTécnica: ${tecnica ?? "-"}\nValor mensal: R$ ${VIP_VALOR_PADRAO}`,
        date: registro.inicio,
        time: "09:00",
        durationMinutes: 30,
      });
    } catch (err) {
      console.error("Google Agenda (assinatura site):", err);
    }
    try {
      await sendNicEmail(
        emailDoSalao(),
        `Pedido de Plano VIP: ${nome} (confirmar no painel)`,
        buildAssinaturaSalonEmail({
          nome,
          whatsapp,
          email,
          tecnica,
          valorMensal: VIP_VALOR_PADRAO,
          inicio: registro.inicio,
          pendente: true,
        })
      );
    } catch (err) {
      console.error("E-mail salão (assinatura site):", err);
    }
  });
  return { ok: true };
}

export async function adminSendLembreteAssinatura(id: number): Promise<{ ok: boolean; msg?: string }> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("planos_assinaturas")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return { ok: false, msg: "Assinatura não encontrada." };
  const row = data as Record<string, unknown>;
  const email = (row.cliente_email as string | null)?.trim();
  if (!email)
    return {
      ok: false,
      msg:
        "Esta assinatura não tem e-mail salvo. Rode o SQL do campo cliente_email no Supabase ou edite a assinatura.",
    };
  const { data: renovacao, diasRestantes } = proximaRenovacao(row.inicio as string | null);
  try {
    await sendNicEmail(
      email,
      `Seu Plano VIP renova em ${diasRestantes} ${diasRestantes === 1 ? "dia" : "dias"} - Nicbeautty`,
      buildReminderEmail({
        nome: row.cliente_nome as string,
        diasRestantes,
        renovacao: renovacao.toLocaleDateString("pt-BR"),
        tecnica: row.tecnica as string | null,
        valorMensal: Number(row.valor_mensal ?? VIP_VALOR_PADRAO),
      })
    );
    return { ok: true, msg: `Lembrete enviado para ${email}` };
  } catch {
    return { ok: false, msg: "Falha ao enviar o lembrete." };
  }
}
