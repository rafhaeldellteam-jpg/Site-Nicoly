"use server";

/** Agenda pública: horários livres, novo agendamento e a área "Meus horários". */

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { hojeSP, horaAgoraSP } from "@/lib/datas";
import {
  ANTECEDENCIA_ALTERACAO_HORAS,
  DURACAO_PADRAO_MIN,
  FIM_EXPEDIENTE,
  HORARIOS,
  duracaoDoServico,
  formatarDuracao,
  horaParaMin,
  minParaHora,
  podeAlterarPeloSite,
  type HorarioGrade,
} from "@/lib/agenda";
import { getBusySlots, createCalendarEvent, deleteCalendarEvent, moveCalendarEvent } from "@/lib/google-calendar";
import { sendNicEmail } from "@/lib/gmail";
import {
  buildAlteracaoSalonEmail,
  buildBookingConfirmationEmail,
  buildBookingSalonEmail,
  buildRemarcadoClienteEmail,
} from "@/lib/emails";
import { ERRO_CAPTCHA, verificarCaptcha } from "@/lib/captcha";
import {
  comNomeDoServico,
  emailDoSalao,
  escaparLike,
  validarEmail,
  validarTelefone,
  type Resultado,
} from "@/lib/servidor";
import type { Appointment, Service } from "@/lib/types";

const dataBR = (iso: string) => iso.split("-").reverse().join("/");

type Intervalo = { ini: number; fim: number; motivo: string };

function sobrepoe(ini: number, fim: number, lista: Intervalo[]): Intervalo | undefined {
  return lista.find((b) => ini < b.fim && fim > b.ini);
}

/**
 * Monta a grade de horários de um dia.
 * Cada horário volta como livre (verde), ocupado (cinza) ou nao_cabe
 * (vermelho claro: está vago, mas o serviço escolhido não termina antes do
 * próximo compromisso ou do fim do expediente).
 */
export async function getAvailableSlots(
  dateISO: string,
  serviceId?: number | null,
  /** ao remarcar: o próprio horário da cliente não conta como ocupado */
  ignorarAgendamentoId?: string | null
): Promise<{ slots: string[]; grade: HorarioGrade[]; duracaoMin: number }> {
  const vazio = { slots: [], grade: [], duracaoMin: DURACAO_PADRAO_MIN };
  if (typeof dateISO !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return vazio;
  const hoje = hojeSP();
  if (dateISO < hoje) {
    return {
      ...vazio,
      grade: HORARIOS.map((hora) => ({ hora, situacao: "ocupado" as const, motivo: "Data já passou" })),
    };
  }

  const [apptsRes, blockedRes, busyCal, svcRes] = await Promise.all([
    supabaseAdmin
      .from("appointments")
      .select("*")
      .eq("appointment_date", dateISO),
    supabaseAdmin.from("blocked_slots").select("block_time, reason").eq("block_date", dateISO),
    getBusySlots(dateISO),
    supabaseAdmin.from("services").select("*"),
  ]);

  const servicos = new Map<number, Service>(
    ((svcRes.data ?? []) as Service[]).map((sv) => [sv.id, sv])
  );
  const duracaoMin = serviceId ? duracaoDoServico(servicos.get(Number(serviceId))) : DURACAO_PADRAO_MIN;

  const ocupados: Intervalo[] = [];
  const eventosIgnorados = new Set<string>();

  // agendamentos já marcados ocupam o tempo inteiro do serviço deles
  for (const a of (apptsRes.data ?? []) as (Appointment & { google_event_id?: string | null })[]) {
    if (a.status === "cancelado") continue;
    if (ignorarAgendamentoId && a.id === ignorarAgendamentoId) {
      if (a.google_event_id) eventosIgnorados.add(a.google_event_id);
      continue;
    }
    const ini = horaParaMin(String(a.appointment_time).slice(0, 5));
    ocupados.push({ ini, fim: ini + duracaoDoServico(servicos.get(Number(a.service_id))), motivo: "Já reservado" });
  }

  // bloqueios feitos no painel (sem horário = dia todo)
  for (const b of blockedRes.data ?? []) {
    if (!b.block_time) {
      const motivo = b.reason ? `Fechado: ${b.reason}` : "Agenda fechada neste dia";
      return {
        slots: [],
        duracaoMin,
        grade: HORARIOS.map((hora) => ({ hora, situacao: "ocupado" as const, motivo })),
      };
    }
    const ini = horaParaMin(String(b.block_time).slice(0, 5));
    ocupados.push({ ini, fim: ini + 60, motivo: "Horário indisponível" });
  }

  // compromissos do Google Agenda da Nicbeautty
  const inicioDia = new Date(`${dateISO}T00:00:00-03:00`).getTime();
  for (const busy of busyCal) {
    if (eventosIgnorados.has(busy.id)) continue;
    const ini = Math.floor((new Date(busy.start).getTime() - inicioDia) / 60000);
    const fim = Math.ceil((new Date(busy.end).getTime() - inicioDia) / 60000);
    if (Number.isFinite(ini) && Number.isFinite(fim) && fim > 0 && ini < 24 * 60)
      ocupados.push({ ini, fim, motivo: "Horário indisponível" });
  }

  const agora = dateISO === hoje ? horaParaMin(horaAgoraSP()) : -1;
  const fimExpediente = horaParaMin(FIM_EXPEDIENTE);

  const grade: HorarioGrade[] = HORARIOS.map((hora) => {
    const ini = horaParaMin(hora);
    if (ini <= agora) return { hora, situacao: "ocupado", motivo: "Horário já passou" };

    const conflitoInicio = sobrepoe(ini, ini + 60, ocupados);
    if (conflitoInicio) return { hora, situacao: "ocupado", motivo: conflitoInicio.motivo };

    const fim = ini + duracaoMin;
    if (fim > fimExpediente)
      return {
        hora,
        situacao: "nao_cabe",
        motivo: `Este serviço leva ${formatarDuracao(duracaoMin)} e passaria do fim do expediente (${FIM_EXPEDIENTE.replace(":00", "h")}).`,
      };
    const conflito = sobrepoe(ini, fim, ocupados);
    if (conflito) {
      const proximo = ocupados
        .filter((o) => o.ini >= ini)
        .reduce((min, o) => Math.min(min, o.ini), Infinity);
      return {
        hora,
        situacao: "nao_cabe",
        motivo: `Este serviço leva ${formatarDuracao(duracaoMin)} e não termina antes do próximo horário ocupado${
          Number.isFinite(proximo) ? ` (${minParaHora(proximo)})` : ""
        }.`,
      };
    }
    return { hora, situacao: "livre" };
  });

  return { slots: grade.filter((g) => g.situacao === "livre").map((g) => g.hora), grade, duracaoMin };
}

export async function createAppointment(input: {
  nome: string;
  telefone: string;
  email?: string;
  serviceId: number;
  data: string;
  horario: string;
  captcha?: string;
}): Promise<Resultado> {
  const ip = await clientIp();
  if (!(await rateLimit(`apt:${ip}`, 5, 10 * 60 * 1000)))
    return { ok: false, erro: "Muitas tentativas. Aguarde alguns minutos." };
  if (!(await verificarCaptcha(input.captcha, ip))) return { ok: false, erro: ERRO_CAPTCHA };

  const nome = String(input.nome ?? "").trim();
  const telefone = String(input.telefone ?? "").trim();
  const emailCliente = String(input.email ?? "").trim().toLowerCase() || null;
  if (nome.length < 3 || nome.length > 80) return { ok: false, erro: "Nome inválido." };
  if (!validarTelefone(telefone)) return { ok: false, erro: "Telefone inválido." };
  if (emailCliente && !validarEmail(emailCliente)) return { ok: false, erro: "E-mail inválido." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.data)) return { ok: false, erro: "Data inválida." };
  if (!(HORARIOS as readonly string[]).includes(input.horario)) return { ok: false, erro: "Horário inválido." };
  if (input.data < hojeSP()) return { ok: false, erro: "Escolha uma data futura." };
  if (input.data > hojeSP(120)) return { ok: false, erro: "Agendamentos abertos para os próximos 4 meses." };

  const { data: svc } = await supabaseAdmin
    .from("services")
    .select("*")
    .eq("id", Number(input.serviceId))
    .single();
  if (!svc || (svc as Service).ativo === false) return { ok: false, erro: "Serviço inválido." };

  const { grade } = await getAvailableSlots(input.data, Number(input.serviceId));
  const escolhido = grade.find((g) => g.hora === input.horario);
  if (!escolhido || escolhido.situacao === "ocupado")
    return { ok: false, erro: "Este horário acabou de ser preenchido. Escolha outro." };
  if (escolhido.situacao === "nao_cabe")
    return { ok: false, erro: escolhido.motivo ?? "Este serviço não cabe neste horário. Escolha outro." };

  const registro = {
    client_name: nome,
    client_phone: telefone,
    client_email: emailCliente,
    service_id: input.serviceId,
    appointment_date: input.data,
    appointment_time: input.horario,
    status: "confirmado",
  };
  // guarda o preço do dia do agendamento (para o financeiro não mudar se o preço mudar depois)
  const valor = (svc as Service).preco != null ? Number((svc as Service).preco) : null;
  let { data: criado, error } = await supabaseAdmin
    .from("appointments")
    .insert({ ...registro, valor })
    .select("id")
    .single();
  if (error && /valor/.test(error.message)) {
    // banco ainda sem a coluna (migração 008 não rodada)
    ({ data: criado, error } = await supabaseAdmin.from("appointments").insert(registro).select("id").single());
  }
  if (error) {
    // 23505 = índice único: outra pessoa reservou o mesmo horário ao mesmo tempo
    if (error.code === "23505")
      return { ok: false, erro: "Este horário acabou de ser preenchido. Escolha outro." };
    return { ok: false, erro: "Erro ao agendar. Tente novamente." };
  }

  const servicoNome = svc?.nome ?? "Atendimento";
  const duracaoMin = duracaoDoServico(svc as Service);
  const emailData = {
    nome,
    telefone,
    email: emailCliente,
    servico: servicoNome,
    data: input.data,
    horario: input.horario,
  };

  const agendamentoId = (criado as { id: string } | null)?.id;

  after(async () => {
    try {
      const eventoId = await createCalendarEvent({
        summary: `${servicoNome} — ${nome}`,
        description: `Cliente: ${nome}\nTelefone: ${telefone}\nServiço: ${servicoNome}\nAgendado pelo site Nicbeautty.`,
        date: input.data,
        time: input.horario,
        durationMinutes: duracaoMin,
      });
      // guarda o evento para poder mover/apagar quando a cliente remarcar ou cancelar
      if (eventoId && agendamentoId)
        await supabaseAdmin.from("appointments").update({ google_event_id: eventoId }).eq("id", agendamentoId);
    } catch (err) {
      console.error("Google Agenda (agendamento):", err);
    }
    try {
      await sendNicEmail(
        emailDoSalao(),
        `Novo agendamento: ${nome} · ${dataBR(input.data)} ${input.horario}`,
        buildBookingSalonEmail(emailData)
      );
    } catch (err) {
      console.error("E-mail salão (agendamento):", err);
    }
    if (emailData.email) {
      try {
        await sendNicEmail(
          emailData.email,
          `Horário confirmado na Nicbeautty — ${dataBR(input.data)} às ${input.horario}`,
          buildBookingConfirmationEmail(emailData)
        );
      } catch (err) {
        console.error("E-mail cliente (agendamento):", err);
      }
    }
  });

  return { ok: true };
}

/** Confere o login da cliente pelo token e devolve o e-mail dela. */
async function emailDaCliente(accessToken: string): Promise<string | null> {
  if (!accessToken || typeof accessToken !== "string") return null;
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data.user?.email) return null;
  return data.user.email.toLowerCase();
}

export async function getMyAppointments(
  accessToken: string
): Promise<(Appointment & { servico_nome: string | null })[]> {
  const email = await emailDaCliente(accessToken);
  if (!email) return [];
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select("*, services(nome)")
    // escapa % e _ para achar só este e-mail (sem eles, "maria_s@" também
    // veria os horários de "mariaxs@", e "%@gmail.com" veria todos)
    .ilike("client_email", escaparLike(email))
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false })
    .limit(60);
  if (error) return [];
  return comNomeDoServico(data);
}

type AgendamentoCompleto = Appointment & {
  google_event_id?: string | null;
  services?: { nome?: string; duracao?: string | null; duracao_min?: number | null } | null;
};

/** Busca um agendamento da própria cliente, já conferindo prazo e situação. */
async function agendamentoDaCliente(
  accessToken: string,
  id: string
): Promise<{ ok: true; a: AgendamentoCompleto } | { ok: false; erro: string }> {
  const email = await emailDaCliente(accessToken);
  if (!email) return { ok: false, erro: "Entre na sua conta de novo para continuar." };
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, erro: "Agendamento não encontrado." };

  const { data } = await supabaseAdmin
    .from("appointments")
    .select("*, services(nome, duracao, duracao_min)")
    .eq("id", id)
    .single();
  const a = data as AgendamentoCompleto | null;
  // só a dona do horário pode mexer nele
  if (!a || (a.client_email ?? "").trim().toLowerCase() !== email) return { ok: false, erro: "Agendamento não encontrado." };
  if (a.status !== "confirmado" && a.status !== null) return { ok: false, erro: "Este horário não pode mais ser alterado." };
  if (!podeAlterarPeloSite(a.appointment_date, a.appointment_time))
    return {
      ok: false,
      erro: `Faltam menos de ${ANTECEDENCIA_ALTERACAO_HORAS}h para o horário. Fale com a Nicoly pelo WhatsApp.`,
    };
  return { ok: true, a };
}

/** A cliente cancela o próprio horário pela área "Meus horários". */
export async function clienteCancelarAgendamento(accessToken: string, id: string): Promise<Resultado> {
  const ip = await clientIp();
  if (!(await rateLimit(`cancelar:${ip}`, 10, 60 * 60 * 1000)))
    return { ok: false, erro: "Muitas tentativas. Aguarde um pouco." };

  const r = await agendamentoDaCliente(accessToken, id);
  if (!r.ok) return r;
  const a = r.a;

  const { error } = await supabaseAdmin.from("appointments").update({ status: "cancelado" }).eq("id", a.id);
  if (error) return { ok: false, erro: "Não foi possível cancelar agora. Tente de novo." };

  after(async () => {
    await deleteCalendarEvent(a.google_event_id);
    try {
      await sendNicEmail(
        emailDoSalao(),
        `Cancelamento: ${a.client_name} · ${dataBR(a.appointment_date)} ${a.appointment_time.slice(0, 5)}`,
        buildAlteracaoSalonEmail({
          tipo: "cancelado",
          nome: a.client_name,
          telefone: a.client_phone,
          servico: a.services?.nome ?? "Atendimento",
          dataAntiga: a.appointment_date,
          horaAntiga: a.appointment_time.slice(0, 5),
        })
      );
    } catch (err) {
      console.error("E-mail salão (cancelamento):", err);
    }
  });
  return { ok: true };
}

/** A cliente troca o dia/horário do próprio agendamento. */
export async function clienteRemarcarAgendamento(
  accessToken: string,
  id: string,
  novaData: string,
  novoHorario: string
): Promise<Resultado> {
  const ip = await clientIp();
  if (!(await rateLimit(`remarcar:${ip}`, 10, 60 * 60 * 1000)))
    return { ok: false, erro: "Muitas tentativas. Aguarde um pouco." };

  const r = await agendamentoDaCliente(accessToken, id);
  if (!r.ok) return r;
  const a = r.a;

  if (typeof novaData !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(novaData)) return { ok: false, erro: "Data inválida." };
  if (!(HORARIOS as readonly string[]).includes(novoHorario)) return { ok: false, erro: "Horário inválido." };
  if (novaData < hojeSP() || novaData > hojeSP(120)) return { ok: false, erro: "Escolha uma data nos próximos 4 meses." };
  if (novaData === a.appointment_date && novoHorario === a.appointment_time.slice(0, 5))
    return { ok: false, erro: "Escolha um dia ou horário diferente do atual." };

  const { grade } = await getAvailableSlots(novaData, a.service_id, a.id);
  const escolhido = grade.find((g) => g.hora === novoHorario);
  if (!escolhido || escolhido.situacao !== "livre")
    return { ok: false, erro: escolhido?.motivo ?? "Este horário não está mais disponível. Escolha outro." };

  const { error } = await supabaseAdmin
    .from("appointments")
    .update({ appointment_date: novaData, appointment_time: novoHorario })
    .eq("id", a.id);
  if (error) {
    if (error.code === "23505") return { ok: false, erro: "Este horário acabou de ser preenchido. Escolha outro." };
    return { ok: false, erro: "Não foi possível remarcar agora. Tente de novo." };
  }
  // o lembrete deve ser enviado de novo para a nova data (ignora se a coluna não existir)
  await supabaseAdmin.from("appointments").update({ lembrete_enviado_em: null }).eq("id", a.id);

  const servico = a.services?.nome ?? "Atendimento";
  const duracaoMin = duracaoDoServico(a.services ?? null);

  after(async () => {
    try {
      const movido = a.google_event_id
        ? await moveCalendarEvent(a.google_event_id, { date: novaData, time: novoHorario, durationMinutes: duracaoMin })
        : false;
      if (!movido) {
        const novoEvento = await createCalendarEvent({
          summary: `${servico} — ${a.client_name}`,
          description: `Cliente: ${a.client_name}\nTelefone: ${a.client_phone}\nServiço: ${servico}\nRemarcado pelo site Nicbeautty.`,
          date: novaData,
          time: novoHorario,
          durationMinutes: duracaoMin,
        });
        if (novoEvento) await supabaseAdmin.from("appointments").update({ google_event_id: novoEvento }).eq("id", a.id);
      }
    } catch (err) {
      console.error("Google Agenda (remarcação):", err);
    }
    try {
      await sendNicEmail(
        emailDoSalao(),
        `Remarcação: ${a.client_name} · agora ${dataBR(novaData)} ${novoHorario}`,
        buildAlteracaoSalonEmail({
          tipo: "remarcado",
          nome: a.client_name,
          telefone: a.client_phone,
          servico,
          dataAntiga: a.appointment_date,
          horaAntiga: a.appointment_time.slice(0, 5),
          dataNova: novaData,
          horaNova: novoHorario,
        })
      );
      if (a.client_email)
        await sendNicEmail(
          a.client_email,
          `Horário remarcado — ${dataBR(novaData)} às ${novoHorario}`,
          buildRemarcadoClienteEmail({
            nome: a.client_name,
            telefone: a.client_phone,
            email: a.client_email,
            servico,
            data: novaData,
            horario: novoHorario,
          })
        );
    } catch (err) {
      console.error("E-mails (remarcação):", err);
    }
  });
  return { ok: true };
}
