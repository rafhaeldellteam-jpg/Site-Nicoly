"use server";

/** Agenda pública: horários livres, novo agendamento e a área "Meus horários". */

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { hojeSP, horaAgoraSP } from "@/lib/datas";
import {
  DURACAO_PADRAO_MIN,
  FIM_EXPEDIENTE,
  HORARIOS,
  duracaoDoServico,
  formatarDuracao,
  horaParaMin,
  minParaHora,
  type HorarioGrade,
} from "@/lib/agenda";
import { getBusySlots, createCalendarEvent } from "@/lib/google-calendar";
import { sendNicEmail } from "@/lib/gmail";
import { buildBookingSalonEmail, buildBookingConfirmationEmail } from "@/lib/emails";
import { comNomeDoServico, emailDoSalao, escaparLike, validarEmail, validarTelefone } from "@/lib/servidor";
import type { Appointment, Service } from "@/lib/types";

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
  serviceId?: number | null
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
      .select("appointment_time, service_id, status")
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

  // agendamentos já marcados ocupam o tempo inteiro do serviço deles
  for (const a of apptsRes.data ?? []) {
    if (a.status === "cancelado") continue;
    const ini = horaParaMin(String(a.appointment_time).slice(0, 5));
    ocupados.push({ ini, fim: ini + duracaoDoServico(servicos.get(a.service_id)), motivo: "Já reservado" });
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
}): Promise<{ ok: boolean; erro?: string }> {
  const ip = await clientIp();
  if (!(await rateLimit(`apt:${ip}`, 5, 10 * 60 * 1000)))
    return { ok: false, erro: "Muitas tentativas. Aguarde alguns minutos." };

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

  const { error } = await supabaseAdmin.from("appointments").insert({
    client_name: nome,
    client_phone: telefone,
    client_email: emailCliente,
    service_id: input.serviceId,
    appointment_date: input.data,
    appointment_time: input.horario,
    status: "confirmado",
  });
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

  after(async () => {
    try {
      await createCalendarEvent({
        summary: `${servicoNome} — ${nome}`,
        description: `Cliente: ${nome}\nTelefone: ${telefone}\nServiço: ${servicoNome}\nAgendado pelo site Nicbeautty.`,
        date: input.data,
        time: input.horario,
        durationMinutes: duracaoMin,
      });
    } catch (err) {
      console.error("Google Agenda (agendamento):", err);
    }
    try {
      await sendNicEmail(
        emailDoSalao(),
        `Novo agendamento: ${nome} · ${input.data.split("-").reverse().join("/")} ${input.horario}`,
        buildBookingSalonEmail(emailData)
      );
    } catch (err) {
      console.error("E-mail salão (agendamento):", err);
    }
    if (emailData.email) {
      try {
        await sendNicEmail(
          emailData.email,
          `Horário confirmado na Nicbeautty — ${input.data.split("-").reverse().join("/")} às ${input.horario}`,
          buildBookingConfirmationEmail(emailData)
        );
      } catch (err) {
        console.error("E-mail cliente (agendamento):", err);
      }
    }
  });

  return { ok: true };
}

export async function getMyAppointments(
  accessToken: string
): Promise<(Appointment & { servico_nome: string | null })[]> {
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
  if (userErr || !userData.user?.email) return [];
  const email = userData.user.email.toLowerCase();
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
