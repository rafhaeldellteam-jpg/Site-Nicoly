"use server";

/** Painel: agendamentos, bloqueios, histórico e indicadores do início. */

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { deleteCalendarEvent } from "@/lib/google-calendar";
import { enviarLembretesDeAmanha } from "@/lib/lembretes";
import { requireAdmin } from "@/lib/admin-auth";
import { hojeSP } from "@/lib/datas";
import { HORARIOS } from "@/lib/agenda";
import { comNomeDoServico } from "@/lib/servidor";
import type { Appointment, DashboardData } from "@/lib/types";

export async function adminGetAppointments(): Promise<(Appointment & { servico_nome: string | null })[]> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select("*, services(nome)")
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });
  if (error) return [];
  return comNomeDoServico(data);
}

export async function adminSetAppointmentStatus(
  id: string,
  status: string
): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  if (!["confirmado", "cancelado", "concluido"].includes(status))
    return { ok: false, erro: "Status inválido." };
  const { data: antes } = await supabaseAdmin.from("appointments").select("*").eq("id", id).single();
  const { error } = await supabaseAdmin
    .from("appointments")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };
  // cancelado no painel → sai do Google Agenda e o horário volta a ficar livre
  const eventoId = (antes as { google_event_id?: string | null } | null)?.google_event_id;
  if (status === "cancelado" && eventoId) after(() => deleteCalendarEvent(eventoId).then(() => undefined));
  return { ok: true };
}

export async function adminGetBlockedSlots(): Promise<
  { id: string; block_date: string; block_time: string | null; reason: string | null }[]
> {
  await requireAdmin();
  const hoje = hojeSP();
  const { data, error } = await supabaseAdmin
    .from("blocked_slots")
    .select("id, block_date, block_time, reason")
    .gte("block_date", hoje)
    .order("block_date", { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function adminAddBlockedSlot(
  data: string,
  horario: string | null,
  motivo: string,
  ate?: string | null
): Promise<{ ok: boolean; erro?: string; dias?: number }> {
  await requireAdmin();
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(data)) return { ok: false, erro: "Data inválida." };
  if (horario && !(HORARIOS as readonly string[]).includes(horario))
    return { ok: false, erro: "Escolha um dos horários da agenda." };

  // período (ex.: férias): um bloqueio de dia inteiro para cada data
  const fim = ate && re.test(ate) ? ate : data;
  if (fim < data) return { ok: false, erro: "A data final precisa ser depois da inicial." };
  const datas: string[] = [];
  for (let d = new Date(`${data}T12:00:00Z`); ; d = new Date(d.getTime() + 86400000)) {
    const iso = d.toISOString().slice(0, 10);
    if (iso > fim) break;
    datas.push(iso);
    if (datas.length > 120) return { ok: false, erro: "Período muito longo (máx. 120 dias)." };
  }

  const linhas = datas.map((d) => ({
    block_date: d,
    block_time: datas.length > 1 ? null : horario,
    reason: String(motivo ?? "").trim().slice(0, 120) || null,
  }));
  const { error } = await supabaseAdmin.from("blocked_slots").insert(linhas);
  return error ? { ok: false, erro: error.message } : { ok: true, dias: datas.length };
}

export async function adminRemoveBlockedSlot(id: string): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("blocked_slots").delete().eq("id", id);
  return error ? { ok: false, erro: error.message } : { ok: true };
}

export async function adminGetHistorico(): Promise<
  (Appointment & { servico_nome: string | null })[]
> {
  await requireAdmin();
  const hoje = hojeSP();
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select("*, services(nome)")
    .or(`appointment_date.lt.${hoje},status.in.(concluido,cancelado)`)
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false })
    .limit(300);
  if (error) return [];
  return comNomeDoServico(data);
}

export async function adminDashboard(): Promise<DashboardData> {
  await requireAdmin();
  const hoje = hojeSP();
  const em7 = hojeSP(7);

  const [agHoje, ag7d, pendentes, assinaturas, concluidos, clientes, proximos, planosPend] =
    await Promise.all([
      supabaseAdmin.from("appointments").select("id", { count: "exact", head: true }).eq("appointment_date", hoje).neq("status", "cancelado"),
      supabaseAdmin.from("appointments").select("id", { count: "exact", head: true }).gte("appointment_date", hoje).lte("appointment_date", em7).neq("status", "cancelado"),
      supabaseAdmin.from("feedbacks").select("id", { count: "exact", head: true }).eq("aprovado", false),
      supabaseAdmin.from("planos_assinaturas").select("id", { count: "exact", head: true }).eq("status", "ativo"),
      supabaseAdmin.from("appointments").select("id", { count: "exact", head: true }).eq("status", "concluido"),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1, page: 1 }),
      supabaseAdmin
        .from("appointments")
        .select("*, services(nome)")
        .gte("appointment_date", hoje)
        .neq("status", "cancelado")
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true })
        .limit(8),
      supabaseAdmin.from("planos_assinaturas").select("id", { count: "exact", head: true }).eq("status", "pendente"),
    ]);

  const proximosRaw = (proximos.data ?? []) as unknown as Record<string, unknown>[];

  return {
    agendados_hoje: agHoje.count ?? 0,
    proximos_7_dias: ag7d.count ?? 0,
    total_clientes:
      (clientes.data as unknown as { totalUsers?: number } | null)?.totalUsers ??
      clientes.data?.users.length ?? 0,
    avaliacoes_pendentes: pendentes.count ?? 0,
    assinaturas_ativas: assinaturas.count ?? 0,
    concluidos_total: concluidos.count ?? 0,
    planos_pendentes: planosPend.count ?? 0,
    proximos: comNomeDoServico(proximosRaw),
  };
}

/** Botão do painel: envia agora os lembretes dos horários de amanhã. */
export async function adminEnviarLembretesAgora(): Promise<{ ok: boolean; erro?: string; msg?: string }> {
  await requireAdmin();
  try {
    const r = await enviarLembretesDeAmanha();
    if (r.atendimentos === 0) return { ok: true, msg: "Nenhum atendimento marcado para amanhã." };
    return {
      ok: true,
      msg: `${r.lembretes} ${r.lembretes === 1 ? "lembrete enviado" : "lembretes enviados"} para amanhã (${r.atendimentos} ${
        r.atendimentos === 1 ? "atendimento" : "atendimentos"
      }). Quem já tinha recebido não recebe de novo.`,
    };
  } catch {
    return { ok: false, erro: "Não foi possível enviar os lembretes agora." };
  }
}
