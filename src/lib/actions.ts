"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { getBusySlots, createCalendarEvent } from "@/lib/google-calendar";
import { sendNicEmail } from "@/lib/gmail";
import {
  buildBookingSalonEmail,
  buildBookingConfirmationEmail,
  buildPlanActivatedEmail,
  buildReminderEmail,
} from "@/lib/emails";
import type {
  Appointment,
  Assinatura,
  ClienteInfo,
  DashboardData,
  Feedback,
  Funcionario,
  GaleriaItem,
  Service,
} from "@/lib/types";

/* ================= PÚBLICO ================= */

export async function getServices(): Promise<Service[]> {
  const { data, error } = await supabaseAdmin
    .from("services")
    .select("*")
    .order("id", { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function getGaleria(): Promise<GaleriaItem[]> {
  const { data, error } = await supabaseAdmin
    .from("galeria")
    .select("*")
    .order("ordem", { ascending: true })
    .order("id", { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function getFuncionarios(): Promise<Funcionario[]> {
  const { data, error } = await supabaseAdmin
    .from("funcionarios")
    .select("*")
    .order("ordem", { ascending: true })
    .order("id", { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function getApprovedFeedbacks(): Promise<Feedback[]> {
  const { data, error } = await supabaseAdmin
    .from("feedbacks")
    .select("*")
    .eq("aprovado", true)
    .order("id", { ascending: false });
  if (error) return [];
  return data ?? [];
}

const HORARIOS = [
  "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00",
];

export async function getAvailableSlots(dateISO: string): Promise<{ slots: string[] }> {
  const [apptsRes, blockedRes, busyCal] = await Promise.all([
    supabaseAdmin
      .from("appointments")
      .select("appointment_time")
      .eq("appointment_date", dateISO)
      .neq("status", "cancelado"),
    supabaseAdmin.from("blocked_slots").select("block_time").eq("block_date", dateISO),
    getBusySlots(dateISO),
  ]);

  const ocupados = new Set<string>(
    (apptsRes.data ?? []).map((a) => a.appointment_time.slice(0, 5))
  );
  for (const b of blockedRes.data ?? []) {
    if (!b.block_time) return { slots: [] };
    ocupados.add(b.block_time.slice(0, 5));
  }

  // horários ocupados no Google Agenda da Nicbeautty também ficam indisponíveis
  for (const busy of busyCal) {
    const ini = new Date(busy.start).getTime();
    const fim = new Date(busy.end).getTime();
    for (const h of HORARIOS) {
      const slotIni = new Date(`${dateISO}T${h}:00-03:00`).getTime();
      const slotFim = slotIni + 60 * 60 * 1000;
      if (slotIni < fim && slotFim > ini) ocupados.add(h);
    }
  }

  return { slots: HORARIOS.filter((h) => !ocupados.has(h)) };
}

function validarTelefone(tel: string): boolean {
  return /^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/.test(tel.trim());
}

export async function createAppointment(input: {
  nome: string;
  telefone: string;
  email?: string;
  serviceId: number;
  data: string;
  horario: string;
}): Promise<{ ok: boolean; erro?: string }> {
  const ip = input.telefone || "anon";
  if (!rateLimit(`apt:${ip}`, 5, 10 * 60 * 1000))
    return { ok: false, erro: "Muitas tentativas. Aguarde alguns minutos." };

  const nome = input.nome.trim();
  const telefone = input.telefone.trim();
  if (nome.length < 3 || nome.length > 80) return { ok: false, erro: "Nome inválido." };
  if (!validarTelefone(telefone)) return { ok: false, erro: "Telefone inválido." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.data)) return { ok: false, erro: "Data inválida." };
  if (!HORARIOS.includes(input.horario)) return { ok: false, erro: "Horário inválido." };
  if (new Date(input.data + "T23:59:59") < new Date())
    return { ok: false, erro: "Escolha uma data futura." };

  const hoje = new Date().toISOString().split("T")[0];
  if (input.data < hoje) return { ok: false, erro: "Escolha uma data futura." };

  const { slots } = await getAvailableSlots(input.data);
  if (!slots.includes(input.horario))
    return { ok: false, erro: "Este horário acabou de ser preenchido. Escolha outro." };

  const { data: svc } = await supabaseAdmin
    .from("services")
    .select("nome, duracao")
    .eq("id", input.serviceId)
    .single();

  const { error } = await supabaseAdmin.from("appointments").insert({
    client_name: nome,
    client_phone: telefone,
    client_email: input.email?.trim() || null,
    service_id: input.serviceId,
    appointment_date: input.data,
    appointment_time: input.horario,
    status: "confirmado",
  });
  if (error) return { ok: false, erro: "Erro ao agendar. Tente novamente." };

  const servicoNome = svc?.nome ?? "Atendimento";
  const duracaoMin = Math.max(30, Number(svc?.duracao ?? 60) || 60);
  const emailData = {
    nome,
    telefone,
    email: input.email?.trim() || null,
    servico: servicoNome,
    data: input.data,
    horario: input.horario,
  };

  void (async () => {
    try {
      await createCalendarEvent({
        summary: `${servicoNome} — ${nome}`,
        description: `Cliente: ${nome}\nTelefone: ${telefone}\nServiço: ${servicoNome}\nAgendado pelo site Nicbeautty.`,
        date: input.data,
        time: input.horario,
        durationMinutes: duracaoMin,
      });
      await sendNicEmail(
        process.env.GMAIL_USER || "nicbeautty@gmail.com",
        `Novo agendamento: ${nome} · ${input.data.split("-").reverse().join("/")} ${input.horario}`,
        buildBookingSalonEmail(emailData)
      );
      if (emailData.email) {
        await sendNicEmail(
          emailData.email,
          `Horário confirmado na Nicbeautty — ${input.data.split("-").reverse().join("/")} às ${input.horario}`,
          buildBookingConfirmationEmail(emailData)
        );
      }
    } catch (err) {
      console.error("Pós-agendamento:", err);
    }
  })();

  return { ok: true };
}

export async function createFeedback(input: {
  nome: string;
  instagram?: string;
  estrelas: number;
  comentario?: string;
  fotosUrls?: string[];
}): Promise<{ ok: boolean; erro?: string }> {
  if (!rateLimit(`fb:${input.nome}`, 3, 30 * 60 * 1000))
    return { ok: false, erro: "Muitos envios. Aguarde um pouco." };

  const nome = input.nome.trim();
  if (nome.length < 2 || nome.length > 60) return { ok: false, erro: "Nome inválido." };
  const estrelas = Math.min(5, Math.max(1, Math.round(input.estrelas)));
  if (estrelas < 1) return { ok: false, erro: "Escolha as estrelas." };
  if ((input.comentario ?? "").length > 500) return { ok: false, erro: "Comentário muito longo." };
  const urls = (input.fotosUrls ?? []).slice(0, 5);

  const { error } = await supabaseAdmin.from("feedbacks").insert({
    nome,
    instagram: input.instagram?.trim() || null,
    estrelas,
    comentario: input.comentario?.trim() || null,
    imagens: urls,
    aprovado: false,
  });
  if (error) return { ok: false, erro: "Erro ao enviar avaliação." };
  return { ok: true };
}

export async function uploadFeedbackPhoto(file: File): Promise<{ url?: string; erro?: string }> {
  if (file.size > 5 * 1024 * 1024) return { erro: "Foto maior que 5MB." };
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return { erro: "Formato inválido." };
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from("feedbacks")
    .upload(path, await file.arrayBuffer(), { contentType: file.type });
  if (error) return { erro: "Falha no upload da foto." };
  return {
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/feedbacks/${path}`,
  };
}

/* ================= ADMIN ================= */

export async function adminGetAllServices(): Promise<Service[]> {
  return getServices();
}

export async function adminSaveService(service: Service): Promise<{ ok: boolean; erro?: string }> {
  const { error } = await supabaseAdmin.from("services").upsert(service, { onConflict: "id" });
  return error ? { ok: false, erro: error.message } : { ok: true };
}

export async function adminDeleteService(id: number): Promise<{ ok: boolean; erro?: string }> {
  const { error } = await supabaseAdmin.from("services").delete().eq("id", id);
  return error ? { ok: false, erro: error.message } : { ok: true };
}

export async function adminGetFeedbacks(): Promise<Feedback[]> {
  const { data, error } = await supabaseAdmin
    .from("feedbacks")
    .select("*")
    .order("id", { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function adminSetFeedbackAprovado(
  id: number,
  aprovado: boolean
): Promise<{ ok: boolean; erro?: string }> {
  const { error } = await supabaseAdmin
    .from("feedbacks")
    .update({ aprovado })
    .eq("id", id);
  return error ? { ok: false, erro: error.message } : { ok: true };
}

export async function adminDeleteFeedback(id: number): Promise<{ ok: boolean; erro?: string }> {
  const { error } = await supabaseAdmin.from("feedbacks").delete().eq("id", id);
  return error ? { ok: false, erro: error.message } : { ok: true };
}

export async function adminGetAppointments(): Promise<(Appointment & { servico_nome: string | null })[]> {
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select("*, services(nome)")
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });
  if (error) return [];
  return (data ?? []).map((a: Record<string, unknown>) => ({
    ...(a as unknown as Appointment),
    servico_nome:
      a.services && typeof a.services === "object"
        ? ((a.services as { nome?: string }).nome ?? null)
        : null,
  }));
}

export async function adminSetAppointmentStatus(
  id: string,
  status: string
): Promise<{ ok: boolean; erro?: string }> {
  if (!["confirmado", "cancelado", "concluido"].includes(status))
    return { ok: false, erro: "Status inválido." };
  const { error } = await supabaseAdmin
    .from("appointments")
    .update({ status })
    .eq("id", id);
  return error ? { ok: false, erro: error.message } : { ok: true };
}

export async function adminGetBlockedSlots(): Promise<
  { id: string; block_date: string; block_time: string | null; reason: string | null }[]
> {
  const hoje = new Date().toISOString().split("T")[0];
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
  motivo: string
): Promise<{ ok: boolean; erro?: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { ok: false, erro: "Data inválida." };
  const { error } = await supabaseAdmin.from("blocked_slots").insert({
    block_date: data,
    block_time: horario,
    reason: motivo.trim() || null,
  });
  return error ? { ok: false, erro: error.message } : { ok: true };
}

export async function adminRemoveBlockedSlot(id: string): Promise<{ ok: boolean; erro?: string }> {
  const { error } = await supabaseAdmin.from("blocked_slots").delete().eq("id", id);
  return error ? { ok: false, erro: error.message } : { ok: true };
}

export async function uploadServiceImage(file: File): Promise<{ url?: string; erro?: string }> {
  if (file.size > 8 * 1024 * 1024) return { erro: "Imagem maior que 8MB." };
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return { erro: "Formato inválido." };
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from("products")
    .upload(path, await file.arrayBuffer(), { contentType: file.type });
  if (error) return { erro: "Falha no upload." };
  return {
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${path}`,
  };
}

/* ================= GALERIA ================= */

export async function adminGetGaleria(): Promise<GaleriaItem[]> {
  const { data, error } = await supabaseAdmin
    .from("galeria")
    .select("*")
    .order("ordem", { ascending: true })
    .order("id", { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function adminSaveGaleria(item: GaleriaItem): Promise<{ ok: boolean; erro?: string }> {
  if (!item.titulo?.trim()) return { ok: false, erro: "Título obrigatório." };
  if (!item.imagem) return { ok: false, erro: "Envie uma imagem." };
  const registro = {
    ...(item.id ? { id: item.id } : {}),
    titulo: item.titulo.trim(),
    descricao: item.descricao?.trim() || null,
    imagem: item.imagem,
    ordem: item.ordem ?? 0,
  };
  const { error } = await supabaseAdmin.from("galeria").upsert(registro, { onConflict: "id" });
  return error ? { ok: false, erro: error.message } : { ok: true };
}

export async function adminDeleteGaleria(id: number): Promise<{ ok: boolean; erro?: string }> {
  const { error } = await supabaseAdmin.from("galeria").delete().eq("id", id);
  return error ? { ok: false, erro: error.message } : { ok: true };
}

export async function uploadGaleriaImagem(file: File): Promise<{ url?: string; erro?: string }> {
  if (file.size > 8 * 1024 * 1024) return { erro: "Imagem maior que 8MB." };
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return { erro: "Formato inválido." };
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `galeria_${Date.now()}_${Math.random().toString(36).slice(2, 11)}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from("galeria")
    .upload(path, await file.arrayBuffer(), { contentType: file.type });
  if (error) return { erro: "Falha no upload." };
  return {
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/galeria/${path}`,
  };
}

/* ================= FUNCIONÁRIOS ================= */

export async function adminGetFuncionarios(): Promise<Funcionario[]> {
  const { data, error } = await supabaseAdmin
    .from("funcionarios")
    .select("*")
    .order("ordem", { ascending: true })
    .order("id", { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function adminSaveFuncionario(
  f: Funcionario
): Promise<{ ok: boolean; erro?: string }> {
  if (!f.nome?.trim()) return { ok: false, erro: "Nome obrigatório." };
  const registro = {
    ...(f.id ? { id: f.id } : {}),
    nome: f.nome.trim(),
    especialidade: f.especialidade?.trim() || null,
    bio: f.bio?.trim() || null,
    foto: f.foto || null,
    ativo: f.ativo ?? true,
    ordem: f.ordem ?? 0,
  };
  const { error } = await supabaseAdmin.from("funcionarios").upsert(registro, { onConflict: "id" });
  return error ? { ok: false, erro: error.message } : { ok: true };
}

export async function adminDeleteFuncionario(id: number): Promise<{ ok: boolean; erro?: string }> {
  const { error } = await supabaseAdmin.from("funcionarios").delete().eq("id", id);
  return error ? { ok: false, erro: error.message } : { ok: true };
}

export async function uploadFuncionarioFoto(
  file: File
): Promise<{ url?: string; erro?: string }> {
  if (file.size > 5 * 1024 * 1024) return { erro: "Foto maior que 5MB." };
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return { erro: "Formato inválido." };
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `func_${Date.now()}_${Math.random().toString(36).slice(2, 11)}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from("funcionarios")
    .upload(path, await file.arrayBuffer(), { contentType: file.type });
  if (error) return { erro: "Falha no upload." };
  return {
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/funcionarios/${path}`,
  };
}

/* ================= PLANOS VIP ================= */

export async function adminGetAssinaturas(): Promise<Assinatura[]> {
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
  if (!a.cliente_nome?.trim()) return { ok: false, erro: "Nome do cliente obrigatório." };
  const registro = {
    ...(a.id ? { id: a.id } : {}),
    cliente_nome: a.cliente_nome.trim(),
    cliente_whatsapp: a.cliente_whatsapp?.trim() || null,
    tecnica: a.tecnica?.trim() || null,
    valor_mensal: a.valor_mensal ?? 180,
    inicio: a.inicio || new Date().toISOString().split("T")[0],
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
    void createCalendarEvent({
      summary: `Plano VIP — ${registro.cliente_nome}`,
      description: `Plano VIP Nicbeautty\nCliente: ${registro.cliente_nome}\nWhatsApp: ${registro.cliente_whatsapp ?? "-"}\nTécnica: ${registro.tecnica ?? "-"}\nValor mensal: R$ ${registro.valor_mensal}`,
      date: registro.inicio,
      time: "09:00",
      durationMinutes: 30,
    }).catch(() => {});

    if (emailCliente) {
      void sendNicEmail(
        emailCliente,
        "Seu Plano VIP Nicbeautty foi ativado!",
        buildPlanActivatedEmail({
          nome: registro.cliente_nome,
          tecnica: registro.tecnica,
          valorMensal: registro.valor_mensal ?? 180,
          inicio: registro.inicio,
        })
      ).catch(() => {});
    }
  }
  return { ok: true };
}

export async function adminSetAssinaturaStatus(
  id: number,
  status: string
): Promise<{ ok: boolean; erro?: string }> {
  if (!["ativo", "pausado", "cancelado"].includes(status))
    return { ok: false, erro: "Status inválido." };
  const { error } = await supabaseAdmin
    .from("planos_assinaturas")
    .update({ status })
    .eq("id", id);
  return error ? { ok: false, erro: error.message } : { ok: true };
}

export async function adminDeleteAssinatura(id: number): Promise<{ ok: boolean; erro?: string }> {
  const { error } = await supabaseAdmin.from("planos_assinaturas").delete().eq("id", id);
  return error ? { ok: false, erro: error.message } : { ok: true };
}

/* ================= CLIENTES (contas do site) ================= */

export async function adminListClientes(): Promise<ClienteInfo[]> {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 });
  if (error) return [];
  return (data.users ?? []).map((u) => {
    const meta = (u.user_metadata ?? {}) as Record<string, string>;
    return {
      id: u.id,
      email: u.email ?? "",
      nome: meta.nome ?? meta.full_name ?? meta.name ?? null,
      telefone: meta.telefone ?? meta.phone ?? null,
      provedor:
        (u.app_metadata?.provider as string) ||
        (u.identities?.[0]?.provider as string) ||
        "email",
      criado_em: u.created_at ?? "",
    };
  });
}

/* ================= DASHBOARD + HISTÓRICO ================= */

export async function adminDashboard(): Promise<DashboardData> {
  const hoje = new Date().toISOString().split("T")[0];
  const em7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [agHoje, ag7d, pendentes, assinaturas, concluidos, clientes, proximos] =
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
    proximos: proximosRaw.map((a) => ({
      ...(a as unknown as Appointment),
      servico_nome:
        a.services && typeof a.services === "object"
          ? ((a.services as { nome?: string }).nome ?? null)
          : null,
    })),
  };
}

export async function adminGetHistorico(): Promise<
  (Appointment & { servico_nome: string | null })[]
> {
  const hoje = new Date().toISOString().split("T")[0];
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select("*, services(nome)")
    .or(`appointment_date.lt.${hoje},status.in.(concluido,cancelado)`)
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false })
    .limit(300);
  if (error) return [];
  return (data ?? []).map((a: Record<string, unknown>) => ({
    ...(a as unknown as Appointment),
    servico_nome:
      a.services && typeof a.services === "object"
        ? ((a.services as { nome?: string }).nome ?? null)
        : null,
  }));
}

/* ================= MEUS HORARIOS (cliente logado) ================= */

export async function getMyAppointments(
  accessToken: string
): Promise<(Appointment & { servico_nome: string | null })[]> {
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
  if (userErr || !userData.user?.email) return [];
  const email = userData.user.email.toLowerCase();
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select("*, services(nome)")
    .ilike("client_email", email)
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false })
    .limit(60);
  if (error) return [];
  return (data ?? []).map((a: Record<string, unknown>) => ({
    ...(a as unknown as Appointment),
    servico_nome:
      a.services && typeof a.services === "object"
        ? ((a.services as { nome?: string }).nome ?? null)
        : null,
  }));
}

/* ================= PLANO VIP DIRETO DO SITE ================= */

export async function createAssinaturaPublic(input: {
  nome: string;
  whatsapp: string;
  email?: string;
  tecnica?: string;
}): Promise<{ ok: boolean; erro?: string }> {
  if (!rateLimit(`plano:${input.whatsapp || input.nome}`, 3, 30 * 60 * 1000))
    return { ok: false, erro: "Muitas tentativas. Aguarde alguns minutos." };

  const nome = input.nome.trim();
  const whatsapp = input.whatsapp.trim();
  const email = input.email?.trim() || null;
  const tecnica = input.tecnica?.trim() || null;
  if (nome.length < 3 || nome.length > 80) return { ok: false, erro: "Nome inválido." };
  if (!validarTelefone(whatsapp)) return { ok: false, erro: "WhatsApp inválido." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, erro: "E-mail inválido." };

  const registro = {
    cliente_nome: nome,
    cliente_whatsapp: whatsapp,
    tecnica,
    valor_mensal: 180,
    inicio: new Date().toISOString().split("T")[0],
    status: "ativo",
  };

  let { error } = await supabaseAdmin.from("planos_assinaturas").upsert(
    { ...registro, ...(email ? { cliente_email: email } : {}) },
    { onConflict: "id" }
  );
  if (error && /cliente_email/i.test(error.message)) {
    ({ error } = await supabaseAdmin.from("planos_assinaturas").insert(registro));
  }
  if (error) return { ok: false, erro: "Erro ao ativar o plano. Tente novamente." };

  void createCalendarEvent({
    summary: `Plano VIP — ${nome} (site)`,
    description: `Plano VIP ativado pelo site.\nCliente: ${nome}\nWhatsApp: ${whatsapp}\nTécnica: ${tecnica ?? "-"}\nValor mensal: R$ 180`,
    date: registro.inicio,
    time: "09:00",
    durationMinutes: 30,
  }).catch(() => {});

  if (email) {
    void sendNicEmail(
      email,
      "Seu Plano VIP Nicbeautty foi ativado!",
      buildPlanActivatedEmail({ nome, tecnica, valorMensal: 180, inicio: registro.inicio })
    ).catch(() => {});
  }
  return { ok: true };
}

/* ================= LEMBRETE DE PLANO (admin) ================= */

export async function proximaRenovacao(
  inicio: string | null
): Promise<{ data: Date; diasRestantes: number; ciclo: number }> {
  const base = inicio ? new Date(`${inicio}T12:00:00`) : new Date();
  const hoje = new Date();
  let ciclo = Math.max(0, Math.floor((hoje.getTime() - base.getTime()) / (30 * 86400000)));
  let renovacao = new Date(base.getTime() + (ciclo + 1) * 30 * 86400000);
  if (renovacao < hoje) {
    ciclo += 1;
    renovacao = new Date(base.getTime() + (ciclo + 1) * 30 * 86400000);
  }
  const diasRestantes = Math.max(0, Math.ceil((renovacao.getTime() - hoje.getTime()) / 86400000));
  return { data: renovacao, diasRestantes, ciclo };
}

export async function adminSendLembreteAssinatura(id: number): Promise<{ ok: boolean; msg?: string }> {
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
  const { data: renovacao, diasRestantes } = await proximaRenovacao(row.inicio as string | null);
  try {
    await sendNicEmail(
      email,
      `Seu Plano VIP renova em ${diasRestantes} ${diasRestantes === 1 ? "dia" : "dias"} - Nicbeautty`,
      buildReminderEmail({
        nome: row.cliente_nome as string,
        diasRestantes,
        renovacao: renovacao.toLocaleDateString("pt-BR"),
        tecnica: row.tecnica as string | null,
        valorMensal: Number(row.valor_mensal ?? 180),
      })
    );
    return { ok: true, msg: `Lembrete enviado para ${email}` };
  } catch {
    return { ok: false, msg: "Falha ao enviar o lembrete." };
  }
}
