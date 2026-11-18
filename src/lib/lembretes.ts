import { supabaseAdmin } from "@/lib/supabase";
import { hojeSP } from "@/lib/datas";
import { sendNicEmail } from "@/lib/gmail";
import { buildAgendaDoDiaEmail, buildLembreteAgendamentoEmail } from "@/lib/emails";
import { emailDoSalao } from "@/lib/servidor";

/*
 * Lembretes dos agendamentos de AMANHÃ.
 * Usado pela rotina diária (src/app/api/cron/lembretes) e pelo botão
 * "Enviar lembretes agora" do painel. Cada cliente recebe no máximo um
 * lembrete por horário (coluna lembrete_enviado_em).
 */

type Linha = {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  appointment_date: string;
  appointment_time: string;
  status: string | null;
  lembrete_enviado_em?: string | null;
  services?: { nome?: string } | null;
};

export async function enviarLembretesDeAmanha(): Promise<{
  data: string;
  atendimentos: number;
  lembretes: number;
  falhas: number;
}> {
  const amanha = hojeSP(1);
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select("*, services(nome)")
    .eq("appointment_date", amanha)
    .order("appointment_time", { ascending: true });
  if (error) throw new Error(error.message);

  const agendados = ((data ?? []) as Linha[]).filter((a) => a.status !== "cancelado" && a.status !== "concluido");
  const colunaExiste = agendados.length === 0 || "lembrete_enviado_em" in agendados[0];

  let enviados = 0;
  let falhas = 0;
  for (const a of agendados) {
    if (!a.client_email || a.lembrete_enviado_em) continue;
    try {
      await sendNicEmail(
        a.client_email,
        `Lembrete: seu horário na Nicbeautty é amanhã às ${a.appointment_time.slice(0, 5)}`,
        buildLembreteAgendamentoEmail({
          nome: a.client_name,
          telefone: a.client_phone,
          email: a.client_email,
          servico: a.services?.nome ?? "Atendimento",
          data: a.appointment_date,
          horario: a.appointment_time.slice(0, 5),
        })
      );
      enviados++;
      // marca como enviado para não repetir se a rotina rodar de novo
      if (colunaExiste)
        await supabaseAdmin
          .from("appointments")
          .update({ lembrete_enviado_em: new Date().toISOString() })
          .eq("id", a.id);
    } catch (err) {
      falhas++;
      console.error("lembrete:", a.id, err);
    }
  }

  // resumo para o salão (só quando há atendimentos amanhã)
  if (agendados.length > 0) {
    try {
      await sendNicEmail(
        emailDoSalao(),
        `Agenda de amanhã: ${agendados.length} ${agendados.length === 1 ? "atendimento" : "atendimentos"}`,
        buildAgendaDoDiaEmail(
          amanha,
          agendados.map((a) => ({
            horario: a.appointment_time.slice(0, 5),
            nome: a.client_name,
            servico: a.services?.nome ?? "Atendimento",
            telefone: a.client_phone,
          }))
        )
      );
    } catch (err) {
      console.error("resumo do dia:", err);
    }
  }

  return { data: amanha, atendimentos: agendados.length, lembretes: enviados, falhas };
}
