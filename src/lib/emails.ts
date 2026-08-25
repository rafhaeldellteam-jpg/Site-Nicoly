const BASE = "https://nicbeautty-novo.vercel.app";
const LOGO = `${BASE}/images/logo-email.jpg`;
const CHECK = `${BASE}/icons/icon-check.png`;

interface Linha {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}

function LINHAS(rows: Linha[]): string {
  return rows
    .map(
      (r) => `
      <tr>
        <td style="padding:9px 0;color:#a1a1a8;font-size:13px;">${r.rotulo}</td>
        <td style="padding:9px 0;color:${r.destaque ? "#d8a37d" : "#f5f5f7"};font-size:${r.destaque ? "15px" : "14px"};font-weight:600;text-align:right;">${r.valor}</td>
      </tr>
      <tr><td colspan="2"><hr style="border:none;border-top:1px solid rgba(216,163,125,0.15);margin:0;"></td></tr>`
    )
    .join("");
}

function EMAIL(opts: {
  tituloIcone?: string;
  subtituloIcone?: string;
  corpoTabela?: Linha[];
  mensagemExtra?: string;
  botao?: { texto: string; url: string };
  rodapeMsg: string;
}): string {
  const icone = opts.tituloIcone
    ? `<div style="text-align:center;margin-bottom:22px;">
        <div style="width:60px;height:60px;background-color:rgba(216,163,125,0.18);border-radius:50%;margin:0 auto 14px;">
          <img src="${CHECK}" width="30" height="30" alt="" style="display:block;margin:0 auto;padding-top:15px;" />
        </div>
        <h2 style="color:#f5f5f7;margin:0;font-size:21px;">${opts.tituloIcone}</h2>
        ${opts.subtituloIcone ? `<p style="color:#a1a1a8;margin:8px 0 0;font-size:14px;">${opts.subtituloIcone}</p>` : ""}
      </div>`
    : "";

  const tabela = opts.corpoTabela?.length
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0d10;border-radius:12px;border:1px solid rgba(216,163,125,0.2);margin-bottom:24px;">
        <tr><td style="padding:20px;">
          <table width="100%" cellpadding="0" cellspacing="0">${LINHAS(opts.corpoTabela)}</table>
        </td></tr>
      </table>`
    : "";

  const botao = opts.botao
    ? `<div style="text-align:center;margin-top:6px;">
        <a href="${opts.botao.url}" style="display:inline-block;background:linear-gradient(135deg,#f0cbb0,#d8a37d,#b8825c);color:#14100c;text-decoration:none;font-weight:bold;font-size:14px;padding:14px 34px;border-radius:13px;">${opts.botao.texto}</a>
      </div>`
    : "";

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0c;" bgcolor="#0a0a0c">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0a0a0c" style="background-color:#0a0a0c;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#121216;border-radius:18px;border:1px solid rgba(216,163,125,0.35);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#f0cbb0,#d8a37d,#b8825c);padding:28px;text-align:center;">
              <img src="${LOGO}" alt="Nicbeautty Lash Designer" width="84" style="display:block;margin:0 auto 12px;width:84px;height:auto;border-radius:50%;border:3px solid rgba(10,10,12,0.85);" />
              <h1 style="color:#14100c;margin:0;font-size:23px;font-weight:800;letter-spacing:3px;">Nicbeautty</h1>
              <p style="color:#14100c;margin:4px 0 0;opacity:0.75;font-size:12px;letter-spacing:4px;">- LASH DESIGNER -</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 30px;">
              ${icone}
              ${tabela}
              ${opts.mensagemExtra ?? ""}
              ${botao}
            </td>
          </tr>
          <tr>
            <td style="background-color:rgba(255,255,255,0.02);padding:18px;text-align:center;border-top:1px solid rgba(216,163,125,0.15);">
              <p style="color:#71717a;font-size:11px;margin:0 0 4px;">${opts.rodapeMsg}</p>
              <p style="color:#52525b;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} Nicbeautty Lash Designer</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function formatBRDate(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split("-");
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).replace(/^\w/, (c) => c.toUpperCase()) || `${d}/${m}/${y}`;
}

/* ============ BOAS-VINDAS ============ */
export function buildWelcomeEmail(nome: string | null): string {
  const primeiro = (nome ?? "").split(" ")[0] || "querida cliente";
  return EMAIL({
    tituloIcone: `Bem-vinda, ${primeiro}!`,
    subtituloIcone: "Sua conta foi criada com sucesso",
    corpoTabela: [
      { rotulo: "Técnicas exclusivas", valor: "Fio a Fio · Volume · Design" },
      { rotulo: "Agendamento", valor: "Pelo site, em segundos", destaque: true },
      { rotulo: "Planos VIP", valor: "Cílios impecáveis todo mês" },
    ],
    mensagemExtra: `<p style="color:#c9c9d1;font-size:14px;line-height:1.7;margin:0;text-align:center;">
      Realce a beleza do seu olhar com quem entende de cílios.
      Sua agenda está a um clique de distância.
    </p>`,
    botao: { texto: "Agendar Meu Horário", url: `${BASE}/catalogo` },
    rodapeMsg: "Você recebeu este e-mail porque criou uma conta no site da Nicbeautty.",
  });
}

/* ============ AGENDAMENTOS ============ */
export interface BookingEmailData {
  nome: string;
  telefone: string;
  email?: string | null;
  servico: string;
  data: string;
  horario: string;
}

export function buildBookingSalonEmail(d: BookingEmailData): string {
  return EMAIL({
    tituloIcone: "Novo Agendamento",
    subtituloIcone: "Um novo horário foi reservado pelo site",
    corpoTabela: [
      { rotulo: "Cliente", valor: d.nome },
      { rotulo: "WhatsApp", valor: d.telefone },
      ...(d.email ? [{ rotulo: "E-mail", valor: d.email }] : []),
      { rotulo: "Serviço", valor: d.servico, destaque: true },
      { rotulo: "Data", valor: formatBRDate(d.data) },
      { rotulo: "Horário", valor: d.horario, destaque: true },
    ],
    mensagemExtra: `<p style="color:#a1a1a8;font-size:12px;margin:0;text-align:center;">
      O compromisso também foi adicionado automaticamente ao Google Agenda.
    </p>`,
    rodapeMsg: "Notificação automática do site Nicbeautty.",
  });
}

export function buildBookingConfirmationEmail(d: BookingEmailData): string {
  return EMAIL({
    tituloIcone: "Seu Horário Está Confirmado!",
    subtituloIcone: `Mal podemos esperar para receber você, ${(d.nome || "").split(" ")[0] || "querida"}`,
    corpoTabela: [
      { rotulo: "Serviço", valor: d.servico, destaque: true },
      { rotulo: "Data", valor: formatBRDate(d.data) },
      { rotulo: "Horário", valor: d.horario, destaque: true },
      { rotulo: "Local", valor: "Nicbeautty Studio" },
    ],
    mensagemExtra: `<p style="color:#a1a1a8;font-size:13px;line-height:1.8;margin:0 0 18px;">
      Chegue com os olhos limpos, sem maquiagem nos cílios.<br>
      Precisou remarcar? Fale conosco pelo WhatsApp com antecedência.
    </p>`,
    botao: { texto: "Ver Meu Horário", url: `${BASE}/meus-horarios` },
    rodapeMsg: "Você recebeu este e-mail porque agendou um horário na Nicbeautty.",
  });
}

/* ============ LEMBRETE DE RENOVAÇÃO DO PLANO ============ */
export function buildReminderEmail(d: {
  nome: string;
  diasRestantes: number;
  renovacao: string;
  tecnica?: string | null;
  valorMensal: number;
}): string {
  return EMAIL({
    tituloIcone: `Seu Plano VIP renova em ${d.diasRestantes} ${d.diasRestantes === 1 ? "dia" : "dias"}`,
    subtituloIcone: "Tudo pronto para continuar com cílios impecáveis",
    corpoTabela: [
      { rotulo: "Cliente", valor: d.nome },
      ...(d.tecnica ? [{ rotulo: "Técnica", valor: d.tecnica }] : []),
      { rotulo: "Valor mensal", valor: `R$ ${Number(d.valorMensal).toFixed(2).replace(".", ",")}` },
      { rotulo: "Próxima renovação", valor: d.renovacao, destaque: true },
      { rotulo: "Benefícios", valor: "Prioridade na agenda" },
    ],
    mensagemExtra: `<p style="color:#c9c9d1;font-size:14px;line-height:1.7;margin:0;text-align:center;">
      Nada precisa ser feito agora — é só um lembrete.
      Quer adiantar seu próximo horário? Agende pelo site.
    </p>`,
    botao: { texto: "Agendar Manutenção", url: `${BASE}/catalogo` },
    rodapeMsg: "Você recebeu este e-mail porque é cliente do Plano VIP Nicbeautty.",
  });
}

/* ============ PLANO ATIVADO ============ */
export function buildPlanActivatedEmail(d: {
  nome: string;
  tecnica?: string | null;
  valorMensal: number;
  inicio: string;
}): string {
  return EMAIL({
    tituloIcone: "Plano VIP Ativado!",
    subtituloIcone: `Parabéns, ${(d.nome || "").split(" ")[0] || "querida"}! Você agora é VIP`,
    corpoTabela: [
      { rotulo: "Plano", valor: "Plano VIP Nicbeautty", destaque: true },
      ...(d.tecnica ? [{ rotulo: "Técnica", valor: d.tecnica }] : []),
      { rotulo: "Valor mensal", valor: `R$ ${Number(d.valorMensal).toFixed(2).replace(".", ",")}` },
      { rotulo: "Início", valor: formatBRDate(d.inicio) },
      { rotulo: "Benefícios", valor: "Manutenções inclusas" },
    ],
    mensagemExtra: `<p style="color:#c9c9d1;font-size:14px;line-height:1.7;margin:0;text-align:center;">
      Como membro VIP você tem prioridade total na agenda,
      manutenções mensais inclusas e desconto em design de sobrancelhas.
    </p>`,
    botao: { texto: "Acessar Meu Painel", url: BASE },
    rodapeMsg: "Você recebeu este e-mail porque seu Plano VIP Nicbeautty foi ativado.",
  });
}
