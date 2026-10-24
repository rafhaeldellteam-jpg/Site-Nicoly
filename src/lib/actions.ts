"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/admin-auth";
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
import {
  buildBookingSalonEmail,
  buildBookingConfirmationEmail,
  buildPlanActivatedEmail,
  buildReminderEmail,
  buildAssinaturaSalonEmail,
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

function ordenarServicos(lista: Service[]): Service[] {
  return [...lista].sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999) || a.id - b.id);
}

/** Catálogo público: só serviços ativos, na ordem definida no painel. */
export async function getServices(): Promise<Service[]> {
  const { data, error } = await supabaseAdmin
    .from("services")
    .select("*")
    .order("id", { ascending: true });
  if (error) return [];
  return ordenarServicos(((data ?? []) as Service[]).filter((sv) => sv.ativo !== false));
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

function validarTelefone(tel: string): boolean {
  return /^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/.test(tel.trim());
}

function validarEmail(email: string): boolean {
  return email.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
        process.env.GMAIL_USER || "nicbeautty@gmail.com",
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

export async function createFeedback(input: {
  nome: string;
  instagram?: string;
  estrelas: number;
  comentario?: string;
  fotosUrls?: string[];
}): Promise<{ ok: boolean; erro?: string }> {
  const ip = await clientIp();
  if (!(await rateLimit(`fb:${ip}`, 3, 30 * 60 * 1000)))
    return { ok: false, erro: "Muitos envios. Aguarde um pouco." };

  const nome = String(input.nome ?? "").trim();
  if (nome.length < 2 || nome.length > 60) return { ok: false, erro: "Nome inválido." };
  const estrelas = Math.min(5, Math.max(1, Math.round(input.estrelas)));
  if (estrelas < 1) return { ok: false, erro: "Escolha as estrelas." };
  if ((input.comentario ?? "").length > 500) return { ok: false, erro: "Comentário muito longo." };
  // só aceita fotos que foram enviadas para o nosso próprio bucket
  const prefixo = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/feedbacks/`;
  const urls = (Array.isArray(input.fotosUrls) ? input.fotosUrls : [])
    .filter((u) => typeof u === "string" && u.startsWith(prefixo))
    .slice(0, 5);
  const instagram = String(input.instagram ?? "").trim().replace(/^@/, "").slice(0, 40);
  if (instagram && !/^[\w.]+$/.test(instagram)) return { ok: false, erro: "Instagram inválido." };

  const { error } = await supabaseAdmin.from("feedbacks").insert({
    nome,
    instagram: instagram || null,
    estrelas,
    comentario: input.comentario?.trim() || null,
    imagens: urls,
    aprovado: false,
  });
  if (error) return { ok: false, erro: "Erro ao enviar avaliação." };
  return { ok: true };
}

export async function uploadFeedbackPhoto(file: File): Promise<{ url?: string; erro?: string }> {
  const ip = await clientIp();
  if (!(await rateLimit(`fbfoto:${ip}`, 10, 60 * 60 * 1000)))
    return { erro: "Muitas fotos enviadas. Aguarde um pouco." };
  if (!(file instanceof File)) return { erro: "Arquivo inválido." };
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
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("services")
    .select("*")
    .order("id", { ascending: true });
  if (error) return [];
  return ordenarServicos((data ?? []) as Service[]);
}

/** Atualiza as páginas que mostram o catálogo, para a mudança aparecer na hora. */
function atualizarPaginasPublicas(): void {
  try {
    revalidatePath("/");
    revalidatePath("/catalogo");
    revalidatePath("/planos");
  } catch {
    /* fora de uma requisição — ignora */
  }
}

/** Resposta padrão das ações do painel que mudam algo visível no site. */
function resultado(error: { message: string } | null): { ok: boolean; erro?: string } {
  if (error) return { ok: false, erro: error.message };
  atualizarPaginasPublicas();
  return { ok: true };
}

const COLUNAS_NOVAS_SERVICO = ["duracao_min", "ativo", "destaque", "ordem"] as const;

export async function adminSaveService(
  service: Partial<Service>
): Promise<{ ok: boolean; erro?: string; id?: number }> {
  await requireAdmin();

  const nome = String(service.nome ?? "").trim();
  if (nome.length < 2) return { ok: false, erro: "Informe o nome do serviço." };
  if (nome.length > 80) return { ok: false, erro: "Nome muito longo (máx. 80 caracteres)." };

  const preco =
    service.preco === null || service.preco === undefined || String(service.preco).trim() === ""
      ? null
      : Number(String(service.preco).replace(",", "."));
  if (preco !== null && (!Number.isFinite(preco) || preco < 0 || preco > 100000))
    return { ok: false, erro: "Preço inválido." };

  const duracaoMin = service.duracao_min ? Math.round(Number(service.duracao_min)) : null;
  if (duracaoMin !== null && (!Number.isFinite(duracaoMin) || duracaoMin < 10 || duracaoMin > 600))
    return { ok: false, erro: "Duração inválida (entre 10 min e 10h)." };

  const imagem = service.imagem ? String(service.imagem).trim() : null;
  if (imagem && !/^https:\/\//.test(imagem)) return { ok: false, erro: "A imagem precisa ser um link https." };

  const manutencao = (Array.isArray(service.manutencao) ? service.manutencao : [])
    .map((m) => ({ valor: String(m?.valor ?? "").trim().slice(0, 40), prazo: String(m?.prazo ?? "").trim().slice(0, 40) }))
    .filter((m) => m.valor)
    .slice(0, 6);

  const registro: Record<string, unknown> = {
    nome,
    descricao: String(service.descricao ?? "").trim().slice(0, 600) || null,
    duracao: String(service.duracao ?? "").trim().slice(0, 40) || (duracaoMin ? formatarDuracao(duracaoMin) : null),
    aplicacao: String(service.aplicacao ?? "").trim().slice(0, 120) || null,
    manutencao,
    imagem,
    textobotao: String(service.textobotao ?? "").trim().slice(0, 40) || null,
    preco,
    duracao_min: duracaoMin,
    ativo: service.ativo !== false,
    destaque: service.destaque === true,
    ordem: Number.isFinite(Number(service.ordem)) ? Math.round(Number(service.ordem)) : 0,
  };

  const id = service.id && Number(service.id) > 0 ? Number(service.id) : null;

  const gravar = (dados: Record<string, unknown>) =>
    id
      ? supabaseAdmin.from("services").update(dados).eq("id", id).select("id").single()
      : supabaseAdmin.from("services").insert(dados).select("id").single();

  let { data, error } = await gravar(registro);
  // banco ainda sem as colunas novas (sql-painel-v2.sql não rodado): salva o básico
  if (error && COLUNAS_NOVAS_SERVICO.some((c) => error!.message.includes(c))) {
    const basico = { ...registro };
    for (const c of COLUNAS_NOVAS_SERVICO) delete basico[c];
    ({ data, error } = await gravar(basico));
  }
  if (error) return { ok: false, erro: "Não foi possível salvar: " + error.message };

  atualizarPaginasPublicas();
  return { ok: true, id: (data as { id: number } | null)?.id ?? id ?? undefined };
}

export async function adminDeleteService(id: number): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("services").delete().eq("id", Number(id));
  if (error) return { ok: false, erro: error.message };
  atualizarPaginasPublicas();
  return { ok: true };
}

export async function adminGetFeedbacks(): Promise<Feedback[]> {
  await requireAdmin();
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
  await requireAdmin();
  const { error } = await supabaseAdmin
    .from("feedbacks")
    .update({ aprovado })
    .eq("id", id);
  return resultado(error);
}

export async function adminDeleteFeedback(id: number): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("feedbacks").delete().eq("id", id);
  return resultado(error);
}

export async function adminGetAppointments(): Promise<(Appointment & { servico_nome: string | null })[]> {
  await requireAdmin();
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
  await requireAdmin();
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

export async function uploadServiceImage(file: File): Promise<{ url?: string; erro?: string }> {
  await requireAdmin();
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
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("galeria")
    .select("*")
    .order("ordem", { ascending: true })
    .order("id", { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function adminSaveGaleria(item: GaleriaItem): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
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
  return resultado(error);
}

export async function adminDeleteGaleria(id: number): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("galeria").delete().eq("id", id);
  return resultado(error);
}

export async function uploadGaleriaImagem(file: File): Promise<{ url?: string; erro?: string }> {
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
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
  return resultado(error);
}

export async function adminDeleteFuncionario(id: number): Promise<{ ok: boolean; erro?: string }> {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("funcionarios").delete().eq("id", id);
  return resultado(error);
}

export async function uploadFuncionarioFoto(
  file: File
): Promise<{ url?: string; erro?: string }> {
  await requireAdmin();
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
    valor_mensal: a.valor_mensal ?? 180,
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
      valorMensal: registro.valor_mensal ?? 180,
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
          process.env.GMAIL_USER || "nicbeautty@gmail.com",
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
              valorMensal: registro.valor_mensal ?? 180,
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
            valorMensal: Number(row.valor_mensal ?? 180),
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

/* ================= CLIENTES (contas do site) ================= */

export async function adminListClientes(): Promise<ClienteInfo[]> {
  await requireAdmin();
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
  const ip = await clientIp();
  if (!(await rateLimit(`plano:${ip}`, 3, 30 * 60 * 1000)))
    return { ok: false, erro: "Muitas tentativas. Aguarde alguns minutos." };

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
    valor_mensal: 180,
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
        description: `Pedido de Plano VIP feito pelo site (aguardando confirmação).\nCliente: ${nome}\nWhatsApp: ${whatsapp}\nTécnica: ${tecnica ?? "-"}\nValor mensal: R$ 180`,
        date: registro.inicio,
        time: "09:00",
        durationMinutes: 30,
      });
    } catch (err) {
      console.error("Google Agenda (assinatura site):", err);
    }
    try {
      await sendNicEmail(
        process.env.GMAIL_USER || "nicbeautty@gmail.com",
        `Pedido de Plano VIP: ${nome} (confirmar no painel)`,
        buildAssinaturaSalonEmail({
          nome,
          whatsapp,
          email,
          tecnica,
          valorMensal: 180,
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
