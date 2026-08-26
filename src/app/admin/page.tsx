"use client";

import MarketingPanel from "@/components/MarketingPanel";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";
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
import {
  IconCamera,
  IconCheck,
  IconSave,
  IconStar,
  WhatsAppIcon,
} from "@/components/icons";

const ALLOWLIST = [
  "phael.techsuporte@gmail.com",
  "phael.techsuporte2@gmail.com",
  "nicbeautty@gmail.com",
];

type Aba =
  | "dashboard"
  | "agendamentos"
  | "planos"
  | "clientes"
  | "avaliacoes"
  | "catalogo"
  | "galeria"
  | "funcionarios"
  | "bloqueios"
  | "historico"
  | "marketing";

const ABAS: [Aba, string, ReactNode][] = [
  [
    "dashboard",
    "Dashboard",
    <>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </>,
  ],
  [
    "agendamentos",
    "Agendamentos",
    <>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </>,
  ],
  [
    "planos",
    "Planos VIP",
    <>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </>,
  ],
  [
    "clientes",
    "Clientes",
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </>,
  ],
  [
    "avaliacoes",
    "Avaliações",
    <polygon key="star" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  ],
  [
    "catalogo",
    "Catálogo",
    <>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </>,
  ],
  [
    "galeria",
    "Galeria",
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </>,
  ],
  [
    "funcionarios",
    "Funcionárias",
    <>
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </>,
  ],
  [
    "bloqueios",
    "Bloqueios",
    <>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
      <line x1="8" x2="16" y1="16" y2="22" />
      <line x1="16" x2="21" y1="16" y2="22" />
    </>,
  ],
  [
    "historico",
    "Histórico",
    <>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </>,
  ],
];

const TITULOS: Record<Aba, { titulo: string; subtitulo: string }> = {
  dashboard: { titulo: "Dashboard", subtitulo: "Visão geral do seu negócio" },
  agendamentos: { titulo: "Agendamentos", subtitulo: "Gerencie os horários marcados" },
  planos: { titulo: "Planos VIP", subtitulo: "Assinaturas mensais das clientes" },
  clientes: { titulo: "Clientes", subtitulo: "Contas criadas no site e no Google" },
  avaliacoes: { titulo: "Avaliações", subtitulo: "Aprove ou reprove as avaliações" },
  catalogo: { titulo: "Catálogo", subtitulo: "Serviços, preços, fotos e tempos" },
  galeria: { titulo: "Galeria", subtitulo: "Fotos exibidas na página inicial" },
  funcionarios: { titulo: "Funcionárias", subtitulo: "Equipe apresentada no site" },
  bloqueios: { titulo: "Bloqueios", subtitulo: "Dias ou horários indisponíveis" },
  historico: { titulo: "Histórico", subtitulo: "Atendimentos passados e cancelados" },
  marketing: { titulo: "Marketing", subtitulo: "Blog, promocoes, newsletter e indicacoes" },
};

export default function AdminPage() {
  const [estado, setEstado] = useState<"carregando" | "login" | "negado" | "ok">("carregando");
  const [aba, setAba] = useState<Aba>("dashboard");
  const [erroLogin, setErroLogin] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    function checar() {
      supabase.auth.getSession().then(({ data }) => {
        const email = data.session?.user?.email ?? "";
        if (!email) setEstado("login");
        else if (!ALLOWLIST.includes(email)) setEstado("negado");
        else setEstado("ok");
      });
    }
    checar();
    const { data: sub } = supabase.auth.onAuthStateChange(() => checar());
    return () => sub.subscription.unsubscribe();
  }, []);

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("senha") ?? ""),
    });
    const emailLogado = data.session?.user?.email ?? "";
    if (!error && !!data.session && ALLOWLIST.includes(emailLogado)) {
      setEstado("ok");
      setErroLogin(false);
    } else {
      setErroLogin(true);
    }
  }

  if (estado === "carregando")
    return <main className="min-h-screen flex items-center justify-center text-(--text-muted)">Carregando...</main>;

  if (estado !== "ok")
    return (
      <main className="min-h-screen flex items-center justify-center px-5">
        <div className="lux-card p-10 w-full max-w-sm">
          <h1 className="font-heading text-3xl text-center mb-1">
            Painel <span className="text-(--rose-gold)">Nicbeautty</span>
          </h1>
          <p className="text-center text-xs tracking-[3px] uppercase text-(--text-muted) mb-8">
            Acesso restrito
          </p>

          {estado === "negado" ? (
            <>
              <p className="text-center text-(--text-muted) text-sm mb-6">
                Esta conta não tem permissão de administradora.
              </p>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  location.reload();
                }}
                className="btn btn-primary btn-block"
              >
                Entrar com outra conta
              </button>
            </>
          ) : (
            <form onSubmit={login}>
              <div className="form-group">
                <label>E-mail</label>
                <input name="email" type="email" className="input-lux" required autoComplete="username" />
              </div>
              <div className="form-group">
                <label>Senha</label>
                <input name="senha" type="password" className="input-lux" required autoComplete="current-password" />
              </div>
              {erroLogin && (
                <p className="text-[#ef5350] text-sm text-center mb-3">E-mail ou senha incorretos.</p>
              )}
              <button className="btn btn-primary btn-block mt-2">Entrar</button>
              <p className="text-center text-xs text-(--text-muted) mt-4">
                Apenas administradoras autorizadas.
              </p>
            </form>
          )}
        </div>
      </main>
    );

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-primary)" }}>
      {/* sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 flex flex-col shrink-0 border-r border-(--border-color) transform transition-transform duration-300 pb-[env(safe-area-inset-bottom)] ${
          menuAberto ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{ background: "var(--bg-secondary)" }}
      >
        <div className="p-6 border-b border-(--border-color)">
          <Link href="/" className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-full bg-(--bg-tertiary) border border-(--rose-gold)/40 flex items-center justify-center text-xl text-(--rose-gold)">
              â™¥
            </span>
            <div>
              <h1 className="font-heading text-lg leading-tight">Nicbeautty</h1>
              <p className="text-[0.65rem] uppercase tracking-[2.5px] text-(--text-muted)">Painel Admin</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {ABAS.map(([id, label, icone]) => (
            <button
              key={id}
              onClick={() => {
                setAba(id);
                setMenuAberto(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 min-h-[46px] rounded-xl transition-colors font-medium text-sm ${
                aba === id
                  ? "bg-(--rose-gold)/10 text-(--rose-gold)"
                  : "text-(--text-muted) hover:text-(--rose-gold-light) hover:bg-white/5"
              }`}
            >
              <AdminIcon>{icone}</AdminIcon>
              {label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-(--border-color) space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 min-h-[46px] rounded-xl text-(--text-muted) hover:text-(--rose-gold-light) hover:bg-white/5 transition-colors font-medium text-sm"
          >
            <AdminIcon>
              <>
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </>
            </AdminIcon>
            Voltar ao Site
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              location.reload();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 min-h-[46px] rounded-xl text-(--text-muted) hover:text-[#ef5350] hover:bg-white/5 transition-colors font-medium text-sm"
          >
            <AdminIcon>
              <>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 22 12 16 7" />
                <line x1="21" x2="12" y1="12" y2="12" />
              </>
            </AdminIcon>
            Sair da conta
          </button>
        </div>
      </aside>

      {menuAberto && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMenuAberto(false)}
        />
      )}

      {/* conteudo */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="px-4 md:px-8 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(env(safe-area-inset-bottom)+3rem)] md:pb-12">
          <div className="flex items-center justify-between gap-3 mb-7 mt-2">
            <div className="flex items-center gap-3 min-w-0">
              <button
                className="md:hidden text-(--text-muted) min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 shrink-0"
                onClick={() => setMenuAberto(true)}
                aria-label="Abrir menu"
              >
                <AdminIcon size={24}>
                  <>
                    <path d="M4 5h16" />
                    <path d="M4 12h16" />
                    <path d="M4 19h16" />
                  </>
                </AdminIcon>
              </button>
              <div className="min-w-0">
                <h2 className="font-heading text-xl md:text-2xl truncate">{TITULOS[aba].titulo}</h2>
                <p className="text-xs md:text-sm text-(--text-muted) mt-0.5 truncate">{TITULOS[aba].subtitulo}</p>
              </div>
            </div>
          </div>

          {aba === "dashboard" && <AbaDashboard />}
          {aba === "agendamentos" && <AbaAgendamentos />}
          {aba === "planos" && <AbaPlanos />}
          {aba === "clientes" && <AbaClientes />}
          {aba === "avaliacoes" && <AbaAvaliacoes />}
          {aba === "catalogo" && <AbaCatalogo />}
          {aba === "galeria" && <AbaGaleria />}
          {aba === "funcionarios" && <AbaFuncionarios />}
          {aba === "bloqueios" && <AbaBloqueios />}
          {aba === "historico" && <AbaHistorico />}
          {aba === "marketing" && <MarketingPanel />}
        </div>
      </main>
    </div>
  );
}

function AdminIcon({
  children,
  size = 19,
}: {
  children: ReactNode;
  size?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

function Vazio({ tabela }: { tabela: string }) {
  return (
    <div className="lux-card p-8 text-center max-w-xl mx-auto">
      <p className="text-(--text-muted)">
        As tabelas do painel ainda não existem no banco. Rode o arquivo{" "}
        <code className="text-(--rose-gold)">sql-painel-nicbeautty.sql</code> no SQL Editor do
        Supabase ({tabela}) e recarregue esta página.
      </p>
    </div>
  );
}

/* ==================== DASHBOARD ==================== */

function AbaDashboard() {
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [semTabela, setSemTabela] = useState(false);
  const [atualizado, setAtualizado] = useState<Date | null>(null);

  const carregar = useCallback(async () => {
    const { adminDashboard } = await import("@/lib/actions");
    const d = await adminDashboard();
    setDados(d);
    setAtualizado(new Date());
  }, []);

  useEffect(() => {
    carregar().catch(() => setSemTabela(true));
    const t = setInterval(() => carregar().catch(() => {}), 30000);
    return () => clearInterval(t);
  }, [carregar]);

  if (!dados)
    return <p className="text-(--text-muted)">Carregando indicadores...</p>;

  const cards: [string, number][] = [
    ["Agendados hoje", dados.agendados_hoje],
    ["Próximos 7 dias", dados.proximos_7_dias],
    ["Clientes cadastrados", dados.total_clientes],
    ["Avaliações pendentes", dados.avaliacoes_pendentes],
    ["Planos ativos", dados.assinaturas_ativas],
    ["Atendimentos concluídos", dados.concluidos_total],
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <p className="text-(--text-muted) text-sm">
          Atualização automática a cada 30s{atualizado ? ` Â· última às ${atualizado.toLocaleTimeString("pt-BR")}` : ""}
        </p>
        <button onClick={carregar} className="btn btn-outline py-2! px-5! text-[0.85rem]!">
          Atualizar agora
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {cards.map(([label, valor]) => (
          <div key={label} className="lux-card p-5 text-center">
            <p className="font-heading text-4xl text-(--rose-gold)">{valor}</p>
            <p className="text-xs text-(--text-muted) mt-2 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      <h3 className="font-heading text-xl text-(--rose-gold-light) mb-4">Próximos agendamentos</h3>
      {dados.proximos.length === 0 ? (
        <p className="text-(--text-muted)">Nenhum agendamento futuro por aqui.</p>
      ) : (
        <div className="space-y-4! md:space-y-3! max-w-3xl">
          {dados.proximos.map((a) => (
            <div key={a.id} className="lux-card p-4 flex items-center gap-4 flex-wrap">
              <div className="w-28 shrink-0">
                <strong className="block">{new Date(a.appointment_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</strong>
                <span className="text-(--rose-gold) text-sm">{a.appointment_time.slice(0, 5)}</span>
              </div>
              <div className="flex-1 min-w-[150px]">
                <strong>{a.client_name}</strong>
                <p className="text-sm text-(--text-muted)">{a.servico_nome ?? "Serviço"}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full border border-green-500/30 text-green-400 bg-green-500/10">confirmado</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ==================== AGENDAMENTOS ==================== */

function AbaAgendamentos() {
  const [items, setItems] = useState<(Appointment & { servico_nome: string | null })[] | null>(null);

  const carregar = useCallback(async () => {
    const { adminGetAppointments } = await import("@/lib/actions");
    setItems(await adminGetAppointments());
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!items) return <p className="text-(--text-muted)">Carregando...</p>;
  if (items.length === 0) return <p className="text-(--text-muted)">Nenhum agendamento ainda.</p>;

  const futuros = items.filter((a) => !["concluido", "cancelado"].includes(a.status ?? ""));
  const porData = new Map<string, typeof futuros>();
  for (const a of futuros) {
    const lista = porData.get(a.appointment_date) ?? [];
    lista.push(a);
    porData.set(a.appointment_date, lista);
  }

  return (
    <div className="max-w-3xl space-y-8">
      {porData.size === 0 && <p className="text-(--text-muted)">Nenhum agendamento futuro. Veja o histórico.</p>}
      {[...porData.entries()].map(([data, ags]) => (
        <section key={data}>
          <h3 className="font-heading text-xl text-(--rose-gold-light) mb-3">
            {new Date(data + "T12:00:00").toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </h3>
          <div className="space-y-4! md:space-y-3!">
            {ags.map((a) => (
              <div key={a.id} className="lux-card p-4 flex items-center gap-4 flex-wrap">
                <span className="font-heading text-2xl text-(--rose-gold) w-16">{a.appointment_time}</span>
                <div className="flex-1 min-w-[160px]">
                  <strong>{a.client_name}</strong>
                  <p className="text-sm text-(--text-muted)">
                    {a.servico_nome ?? "Serviço"} â€¢ {a.client_phone}
                  </p>
                </div>
                <select
                  className={`input-lux w-auto! py-2! px-3! text-sm ${
                    a.status === "cancelado" ? "text-[#ef5350]!" : a.status === "concluido" ? "text-green-400!" : ""
                  }`}
                  value={a.status ?? "confirmado"}
                  onChange={async (e) => {
                    const { adminSetAppointmentStatus } = await import("@/lib/actions");
                    await adminSetAppointmentStatus(a.id, e.target.value);
                    carregar();
                  }}
                >
                  <option value="confirmado">Confirmado</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                <a
                  href={`https://wa.me/55${a.client_phone.replace(/\D/g, "").replace(/^55/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-white"
                  style={{ color: "#25d366" }}
                  title="Falar com a cliente"
                >
                  <WhatsAppIcon size={18} />
                </a>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ==================== PLANOS VIP ==================== */

function AbaPlanos() {
  const [items, setItems] = useState<Assinatura[] | null>(null);

  const carregar = useCallback(async () => {
    const { adminGetAssinaturas } = await import("@/lib/actions");
    setItems(await adminGetAssinaturas());
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!items)
    return (
      <>
        <p className="text-(--text-muted)">Carregando assinaturas...</p>
        <FormAssinatura aoSalvar={async () => carregar()} />
        <Vazio tabela="planos_assinaturas" />
      </>
    );

  return (
    <>
      <FormAssinatura aoSalvar={carregar} />
      {items.length === 0 ? (
        <p className="text-(--text-muted)">Nenhuma assinatura registrada ainda.</p>
      ) : (
        <div className="space-y-4! md:space-y-3! max-w-3xl mt-6">
          {items.map((a) => {
            const ren = renovacaoInfo(a.inicio);
            return (
            <div key={a.id} className="lux-card p-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <strong>{a.cliente_nome}</strong>
                  {a.status !== "cancelado" && (
                    <span
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                      style={
                        ren.dias <= 5
                          ? { color: "#ffb74d", background: "rgba(255,183,77,0.12)" }
                          : { color: "#7bd88f", background: "rgba(123,216,143,0.12)" }
                      }
                    >
                      renova em {ren.dias} {ren.dias === 1 ? "dia" : "dias"} â€¢{" "}
                      {ren.renovacao.toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-(--text-muted)">
                  {a.tecnica ?? "Plano Mensal"} â€¢ R$ {Number(a.valor_mensal ?? 180).toFixed(2).replace(".", ",")}/mês
                  {a.cliente_whatsapp ? ` â€¢ ${a.cliente_whatsapp}` : ""}
                </p>
                <p className="text-xs text-(--text-muted)">
                  Início: {a.inicio ? new Date(a.inicio + "T12:00:00").toLocaleDateString("pt-BR") : "-"}
                  {a.cliente_email ? ` â€¢ ${a.cliente_email}` : ""}
                </p>
              </div>
              <button
                onClick={async () => {
                  const { adminSendLembreteAssinatura } = await import("@/lib/actions");
                  const r = await adminSendLembreteAssinatura(a.id!);
                  alert(r.msg ?? (r.ok ? "Lembrete enviado." : "Falha ao enviar."));
                }}
                className="btn btn-outline py-2! px-4! text-[0.8rem]!"
                title="Envia e-mail de lembrete de renovação para a cliente"
              >
                Lembrete
              </button>
              <select
                className={`input-lux w-auto! py-2! px-3! text-sm ${
                  a.status === "cancelado" ? "text-[#ef5350]!" : a.status === "pausado" ? "text-yellow-400!" : "text-green-400!"
                }`}
                value={a.status ?? "ativo"}
                onChange={async (e) => {
                  const { adminSetAssinaturaStatus } = await import("@/lib/actions");
                  await adminSetAssinaturaStatus(a.id!, e.target.value);
                  carregar();
                }}
              >
                <option value="ativo">Ativo</option>
                <option value="pausado">Pausado</option>
                <option value="cancelado">Cancelado</option>
              </select>
              <button
                onClick={async () => {
                  if (!confirm(`Remover assinatura de ${a.cliente_nome}?`)) return;
                  const { adminDeleteAssinatura } = await import("@/lib/actions");
                  await adminDeleteAssinatura(a.id!);
                  carregar();
                }}
                className="btn btn-danger py-2! px-4! text-[0.8rem]!"
              >
                Remover
              </button>
            </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function renovacaoInfo(inicio: string | null): { renovacao: Date; dias: number } {
  const base = inicio ? new Date(`${inicio}T12:00:00`) : new Date();
  const hoje = new Date();
  let ciclo = Math.max(0, Math.floor((hoje.getTime() - base.getTime()) / (30 * 86400000)));
  let renovacao = new Date(base.getTime() + (ciclo + 1) * 30 * 86400000);
  if (renovacao < hoje) {
    ciclo += 1;
    renovacao = new Date(base.getTime() + (ciclo + 1) * 30 * 86400000);
  }
  return {
    renovacao,
    dias: Math.max(0, Math.ceil((renovacao.getTime() - hoje.getTime()) / 86400000)),
  };
}

function FormAssinatura({ aoSalvar }: { aoSalvar: () => void }) {
  const [nome, setNome] = useState("");
  const [whats, setWhats] = useState("");
  const [emailCliente, setEmailCliente] = useState("");
  const [tecnica, setTecnica] = useState("");
  const [valor, setValor] = useState("180");
  const [inicio, setInicio] = useState(new Date().toISOString().split("T")[0]);
  const [msg, setMsg] = useState("");

  return (
    <div className="lux-card p-5 mb-8 max-w-3xl">
      <h3 className="font-heading text-lg mb-4">Nova assinatura VIP</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        <input className="input-lux" placeholder="Nome da cliente *" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input className="input-lux" placeholder="WhatsApp" value={whats} onChange={(e) => setWhats(e.target.value)} />
        <input className="input-lux" placeholder="E-mail (recebe o plano)" value={emailCliente} onChange={(e) => setEmailCliente(e.target.value)} />
        <input className="input-lux" placeholder="Técnica escolhida" value={tecnica} onChange={(e) => setTecnica(e.target.value)} />
        <input className="input-lux" placeholder="Valor mensal" value={valor} onChange={(e) => setValor(e.target.value)} />
      </div>
      <div className="flex gap-3 items-center flex-wrap">
        <label className="text-sm text-(--text-muted)">Início:</label>
        <input type="date" className="input-lux w-auto!" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        <button
          onClick={async () => {
            setMsg("");
            const { adminSaveAssinatura } = await import("@/lib/actions");
            const r = await adminSaveAssinatura({
              cliente_nome: nome,
              cliente_whatsapp: whats,
              cliente_email: emailCliente || null,
              tecnica,
              valor_mensal: Number(valor.replace(",", ".")) || 180,
              inicio,
              status: "ativo",
            });
            if (r.ok) {
              setNome("");
              setWhats("");
              setEmailCliente("");
              setTecnica("");
              setMsg("Assinatura salva!");
              aoSalvar();
            } else setMsg(r.erro ?? "Erro ao salvar.");
          }}
          className="btn btn-primary py-2.5! px-6! text-[0.9rem]!"
        >
          Salvar assinatura
        </button>
        {msg && <span className="text-sm text-(--rose-gold-light)">{msg}</span>}
      </div>
    </div>
  );
}

/* ==================== CLIENTES ==================== */

function AbaClientes() {
  const [items, setItems] = useState<ClienteInfo[] | null>(null);

  const carregar = useCallback(async () => {
    const { adminListClientes } = await import("@/lib/actions");
    setItems(await adminListClientes());
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!items) return <p className="text-(--text-muted)">Carregando clientes...</p>;
  if (items.length === 0)
    return <p className="text-(--text-muted)">Nenhuma conta cadastrada ainda. As contas aparecem aqui automaticamente quando alguém faz login ou cria conta no site.</p>;

  return (
    <>
      <p className="text-(--text-muted) text-sm mb-6">
        {items.length} contas cadastradas (site e Google). Atualiza automaticamente.
      </p>
      <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
        {items.map((c) => (
          <div key={c.id} className="lux-card p-5 flex items-start gap-4">
            <span className="w-11 h-11 rounded-full bg-(--bg-tertiary) border border-(--border-color-strong) flex items-center justify-center font-bold text-(--rose-gold) shrink-0">
              {(c.nome ?? c.email).charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <strong className="block truncate">{c.nome ?? c.email.split("@")[0]}</strong>
              <p className="text-sm text-(--text-muted) truncate">{c.email}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  c.provedor === "google"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                    : "bg-(--rose-gold)/10 text-(--rose-gold) border-(--rose-gold)/30"
                }`}>
                  {c.provedor}
                </span>
                <span className="text-[10px] text-(--text-muted) self-center">
                  desde {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ==================== AVALIAÃ‡Ã•ES ==================== */

function AbaAvaliacoes() {
  const [items, setItems] = useState<Feedback[] | null>(null);

  const carregar = useCallback(async () => {
    const { adminGetFeedbacks } = await import("@/lib/actions");
    setItems(await adminGetFeedbacks());
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!items) return <p className="text-(--text-muted)">Carregando...</p>;
  if (items.length === 0) return <p className="text-(--text-muted)">Nenhuma avaliação recebida.</p>;

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-(--text-muted) text-sm">
        Aprovadas aparecem na home automaticamente. Reprovadas ficam salvas mas ocultas.
      </p>
      {items.map((f) => (
        <div key={f.id} className="lux-card p-5 flex gap-4 items-start flex-wrap sm:flex-nowrap">
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center gap-2 flex-wrap">
              <strong>{f.nome}</strong>
              <span className="flex gap-0.5 text-(--rose-gold)">
                {[...Array(f.estrelas)].map((_, i) => (
                  <IconStar key={i} size={13} />
                ))}
              </span>
              {!f.aprovado && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                  Reprovada / pendente
                </span>
              )}
              {f.aprovado && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                  No ar
                </span>
              )}
            </div>
            {f.instagram && <span className="block text-sm text-(--rose-gold-light)">{f.instagram}</span>}
            {f.comentario && <p className="text-sm text-(--text-muted) mt-1">{f.comentario}</p>}
            {f.imagens && f.imagens.length > 0 && (
              <div className="flex gap-2 mt-2">
                {f.imagens.map((u, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={u} alt="" className="w-14 h-14 rounded-lg object-cover border border-(--border-color)" />
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            {!f.aprovado && (
              <button
                onClick={async () => {
                  const { adminSetFeedbackAprovado } = await import("@/lib/actions");
                  await adminSetFeedbackAprovado(f.id, true);
                  carregar();
                }}
                className="btn btn-primary py-2! px-4! text-[0.8rem]! inline-flex items-center gap-1.5"
              >
                <IconCheck size={13} /> Aprovar
              </button>
            )}
            {f.aprovado && (
              <button
                onClick={async () => {
                  const { adminSetFeedbackAprovado } = await import("@/lib/actions");
                  await adminSetFeedbackAprovado(f.id, false);
                  carregar();
                }}
                className="btn btn-outline py-2! px-4! text-[0.8rem]!"
              >
                Reprovar
              </button>
            )}
            <button
              onClick={async () => {
                if (!confirm("Deletar avaliação de " + f.nome + "?")) return;
                const { adminDeleteFeedback } = await import("@/lib/actions");
                await adminDeleteFeedback(f.id);
                carregar();
              }}
              className="btn btn-danger py-2! px-4! text-[0.8rem]!"
            >
              Deletar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ==================== CATÁLOGO ==================== */

function AbaCatalogo() {
  const [services, setServices] = useState<Service[] | null>(null);

  const carregar = useCallback(async () => {
    const { adminGetAllServices } = await import("@/lib/actions");
    setServices(await adminGetAllServices());
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!services) return <p className="text-(--text-muted)">Carregando catálogo...</p>;

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <p className="text-(--text-muted) text-sm">{services.length} serviços no catálogo Â· alterações entram no site na hora</p>
        <button
          onClick={async () => {
            const { adminSaveService } = await import("@/lib/actions");
            await adminSaveService({
              id: 0,
              nome: "Novo Serviço",
              descricao: "Descreva o serviço.",
              duracao: "2h",
              aplicacao: "",
              manutencao: [],
              imagem: null,
              textobotao: null,
              preco: null,
            } as Service);
            carregar();
          }}
          className="btn btn-primary py-2.5! px-6! text-[0.9rem]!"
        >
          + Novo serviço
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {services.map((s) => (
          <CardServico key={s.id} service={s} aoSalvar={carregar} />
        ))}
      </div>
    </>
  );
}

function CardServico({ service, aoSalvar }: { service: Service; aoSalvar: () => void }) {
  const [nome, setNome] = useState(service.nome);
  const [preco, setPreco] = useState(service.preco != null ? String(service.preco) : "");
  const [descricao, setDescricao] = useState(service.descricao ?? "");
  const [duracao, setDuracao] = useState(service.duracao ?? "");
  const [aplicacao, setAplicacao] = useState(service.aplicacao ?? "");
  const [manutencaoStr, setManutencaoStr] = useState(
    (service.manutencao ?? []).map((m) => `${m.valor} (${m.prazo})`).join("; ")
  );
  const [textobotao, setTextobotao] = useState(service.textobotao ?? "");
  const [imagemUrl, setImagemUrl] = useState(service.imagem ?? "");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const novo = service.id === 0;

  async function salvar() {
    setSalvando(true);
    const { adminSaveService, uploadServiceImage } = await import("@/lib/actions");

    let urlFinal = imagemUrl || null;
    if (arquivo) {
      const up = await uploadServiceImage(arquivo);
      if (up.url) urlFinal = up.url;
      else alert(up.erro);
    }

    const manutencao = manutencaoStr
      .split(";")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => {
        const m = t.match(/(.*)\(([^)]*)\)/);
        return m ? { valor: m[1].trim(), prazo: m[2].trim() } : { valor: t, prazo: "" };
      });

    const payload: Record<string, unknown> = {
      nome,
      descricao: descricao || null,
      duracao: duracao || null,
      aplicacao: aplicacao || null,
      manutencao,
      imagem: urlFinal,
      textobotao: textobotao || null,
      preco: preco.trim() === "" ? null : Number(preco.replace(",", ".")),
    };
    if (!novo) payload.id = service.id;

    const r = await adminSaveService(payload as unknown as Service);
    setSalvando(false);
    if (!r.ok && !r.erro?.includes("column")) alert(r.erro);
    aoSalvar();
  }

  return (
    <div className="lux-card p-6">
      <div className="flex gap-4 mb-4">
        {imagemUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagemUrl} alt={nome} className="w-20 h-20 rounded-xl object-cover border border-(--border-color-strong)" />
        )}
        <div className="flex-1 space-y-3">
          <input className="input-lux" placeholder="Nome do serviço *" value={nome} onChange={(e) => setNome(e.target.value)} />
          <textarea
            className="input-lux resize-none"
            rows={2}
            placeholder="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <input
          className="input-lux"
          placeholder="Valor (ex: 130 ou 130,50)"
          inputMode="decimal"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
        />
        <input className="input-lux" placeholder="Tempo (ex: 2h a 2:30h)" value={duracao} onChange={(e) => setDuracao(e.target.value)} />
      </div>

      <input className="input-lux mb-3" placeholder="Aplicação (texto exibido no catálogo)" value={aplicacao} onChange={(e) => setAplicacao(e.target.value)} />

      <input
        className="input-lux mb-3"
        placeholder='Manutenções â€” ex: R$ 90,00 (até 15 dias); R$ 100,00 (21 dias)'
        value={manutencaoStr}
        onChange={(e) => setManutencaoStr(e.target.value)}
      />
      <input
        className="input-lux mb-3"
        placeholder="Texto do botão (opcional)"
        value={textobotao}
        onChange={(e) => setTextobotao(e.target.value)}
      />
      <input
        className="input-lux mb-4"
        placeholder="URL da imagem atual"
        value={imagemUrl}
        onChange={(e) => setImagemUrl(e.target.value)}
        disabled={!!arquivo}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <label className="btn btn-outline py-2! px-4! text-[0.8rem]! cursor-pointer inline-flex items-center gap-1.5">
          <IconCamera size={14} /> Nova foto
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
        </label>
        {arquivo && <span className="text-xs text-(--text-muted)">{arquivo.name}</span>}
        <button onClick={salvar} disabled={salvando} className="btn btn-primary py-2! px-6! text-[0.85rem]! ml-auto inline-flex items-center gap-1.5">
          {salvando ? "Salvando..." : (<><IconSave size={14} /> Salvar</>)}
        </button>
        {!novo && (
          <button
            onClick={async () => {
              if (!confirm(`Deletar "${nome}"?`)) return;
              const { adminDeleteService } = await import("@/lib/actions");
              await adminDeleteService(service.id);
              aoSalvar();
            }}
            className="btn btn-danger py-2! px-4! text-[0.85rem]!"
          >
            Deletar
          </button>
        )}
      </div>
    </div>
  );
}

/* ==================== GALERIA ==================== */

function AbaGaleria() {
  const [items, setItems] = useState<GaleriaItem[] | null>(null);
  const [titulo, setTitulo] = useState("");
  const [desc, setDesc] = useState("");
  const [ordem, setOrdem] = useState("0");
  const [url, setUrl] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const { adminGetGaleria } = await import("@/lib/actions");
    setItems(await adminGetGaleria());
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function adicionar() {
    setMsg("");
    setSalvando(true);
    try {
      let urlFinal = url;
      if (arquivo) {
        const { uploadGaleriaImagem } = await import("@/lib/actions");
        const up = await uploadGaleriaImagem(arquivo);
        if (up.url) urlFinal = up.url;
        else {
          setMsg(up.erro ?? "Erro no upload.");
          return;
        }
      }
      const { adminSaveGaleria } = await import("@/lib/actions");
      const r = await adminSaveGaleria({
        titulo,
        descricao: desc || null,
        imagem: urlFinal,
        ordem: Number(ordem) || 0,
      });
      if (r.ok) {
        setTitulo("");
        setDesc("");
        setUrl("");
        setArquivo(null);
        setOrdem("0");
        setMsg("Foto adicionada!");
        carregar();
      } else setMsg(r.erro ?? "Erro ao salvar. A tabela existe? Rode o sql-painel-nicbeautty.sql.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <div className="lux-card p-6 mb-8 max-w-3xl">
        <h3 className="font-heading text-lg mb-4">Adicionar foto à galeria do site</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <input className="input-lux" placeholder="Título *" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <input className="input-lux" placeholder="Descrição curta" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mb-3 items-center">
          <label className="btn btn-outline py-2.5! px-5! text-[0.85rem]! cursor-pointer inline-flex items-center gap-2 justify-center">
            <IconCamera size={15} /> {arquivo ? arquivo.name.slice(0, 18) : "Escolher foto"}
            <input type="file" accept="image/*" hidden onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
          </label>
          <input
            className="input-lux"
            placeholder="ou cole uma URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={!!arquivo}
          />
          <input className="input-lux" placeholder="Ordem (0 primeiro)" inputMode="numeric" value={ordem} onChange={(e) => setOrdem(e.target.value)} />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={adicionar} disabled={salvando || !titulo.trim()} className="btn btn-primary py-2.5! px-6! text-[0.9rem]!">
            {salvando ? "Enviando..." : "Adicionar à galeria"}
          </button>
          {msg && <span className="text-sm text-(--rose-gold-light)">{msg}</span>}
        </div>
      </div>

      {items === null ? (
        <p className="text-(--text-muted)">Carregando galeria...</p>
      ) : items.length === 0 ? (
        <p className="text-(--text-muted)">
          Galeria vazia (ou tabela ainda não criada â€” rode o sql-painel-nicbeautty.sql). Enquanto isso o site mostra as fotos padrão.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((g) => (
            <CardGaleria key={g.id} item={g} aoSalvar={carregar} />
          ))}
        </div>
      )}
    </>
  );
}

function CardGaleria({ item, aoSalvar }: { item: GaleriaItem; aoSalvar: () => void }) {
  const [titulo, setTitulo] = useState(item.titulo);
  const [descricao, setDescricao] = useState(item.descricao ?? "");
  const [ordem, setOrdem] = useState(String(item.ordem ?? 0));
  const [salvando, setSalvando] = useState(false);

  return (
    <div className="lux-card overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.imagem} alt={item.titulo} className="w-full aspect-square object-cover" />
      <div className="p-4 space-y-2.5">
        <input className="input-lux" placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <input className="input-lux" placeholder="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <input className="input-lux" placeholder="Ordem" inputMode="numeric" value={ordem} onChange={(e) => setOrdem(e.target.value)} />
        <div className="flex gap-2">
          <button
            onClick={async () => {
              setSalvando(true);
              const { adminSaveGaleria } = await import("@/lib/actions");
              await adminSaveGaleria({
                id: item.id,
                titulo,
                descricao: descricao || null,
                imagem: item.imagem,
                ordem: Number(ordem) || 0,
              });
              setSalvando(false);
              aoSalvar();
            }}
            disabled={salvando}
            className="btn btn-primary py-2! flex-1! text-[0.8rem]! inline-flex items-center justify-center gap-1.5"
          >
            <IconSave size={13} /> Salvar
          </button>
          <button
            onClick={async () => {
              if (!confirm(`Remover "${item.titulo}" da galeria?`)) return;
              const { adminDeleteGaleria } = await import("@/lib/actions");
              await adminDeleteGaleria(item.id!);
              aoSalvar();
            }}
            className="btn btn-danger py-2! px-4! text-[0.8rem]!"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==================== FUNCIONÁRIOS ==================== */

function AbaFuncionarios() {
  const [items, setItems] = useState<Funcionario[] | null>(null);

  const carregar = useCallback(async () => {
    const { adminGetFuncionarios } = await import("@/lib/actions");
    setItems(await adminGetFuncionarios());
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!items)
    return (
      <>
        <p className="text-(--text-muted)">Carregando equipe...</p>
        <Vazio tabela="funcionarios" />
      </>
    );

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <p className="text-(--text-muted) text-sm">{items.length} profissionais</p>
        <button
          onClick={async () => {
            const { adminSaveFuncionario } = await import("@/lib/actions");
            await adminSaveFuncionario({
              nome: "Novo profissional",
              especialidade: "",
              bio: null,
              foto: null,
              ativo: true,
              ordem: items.length + 1,
            });
            carregar();
          }}
          className="btn btn-primary py-2.5! px-6! text-[0.9rem]!"
        >
          + Novo profissional
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        {items.map((f) => (
          <CardFuncionario key={f.id} f={f} aoSalvar={carregar} />
        ))}
      </div>
    </>
  );
}

function CardFuncionario({ f, aoSalvar }: { f: Funcionario; aoSalvar: () => void }) {
  const [nome, setNome] = useState(f.nome);
  const [especialidade, setEspecialidade] = useState(f.especialidade ?? "");
  const [bio, setBio] = useState(f.bio ?? "");
  const [foto, setFoto] = useState(f.foto ?? "");
  const [ativo, setAtivo] = useState(f.ativo ?? true);
  const [ordem, setOrdem] = useState(String(f.ordem ?? 0));
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);

  return (
    <div className="lux-card p-6">
      <div className="flex gap-4 items-center mb-4">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt={nome} className="w-16 h-16 rounded-full object-cover border-2 border-(--rose-gold)" />
        ) : (
          <span className="w-16 h-16 rounded-full bg-(--bg-tertiary) border border-(--border-color-strong) flex items-center justify-center text-xl font-bold text-(--rose-gold)">
            {nome.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="flex-1 space-y-2">
          <input className="input-lux" placeholder="Nome *" value={nome} onChange={(e) => setNome(e.target.value)} />
          <input className="input-lux" placeholder="Especialidade" value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} />
        </div>
      </div>

      <textarea className="input-lux resize-none mb-3" rows={2} placeholder="Bio curta" value={bio} onChange={(e) => setBio(e.target.value)} />

      <div className="grid grid-cols-2 gap-3 mb-3">
        <input className="input-lux" placeholder="URL da foto atual" value={foto} onChange={(e) => setFoto(e.target.value)} disabled={!!arquivo} />
        <input className="input-lux" placeholder="Ordem" inputMode="numeric" value={ordem} onChange={(e) => setOrdem(e.target.value)} />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="btn btn-outline py-2! px-4! text-[0.8rem]! cursor-pointer inline-flex items-center gap-1.5">
          <IconCamera size={14} /> Foto
          <input type="file" accept="image/*" hidden onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
        </label>
        <label className="flex items-center gap-2 text-sm text-(--text-muted) cursor-pointer">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="accent-[#d8a37d]" />
          Ativa
        </label>
        <div className="ml-auto flex gap-2">
          <button
            onClick={async () => {
              setSalvando(true);
              const { adminSaveFuncionario, uploadFuncionarioFoto } = await import("@/lib/actions");
              let urlFinal = foto || null;
              if (arquivo) {
                const up = await uploadFuncionarioFoto(arquivo);
                if (up.url) urlFinal = up.url;
                else alert(up.erro);
              }
              await adminSaveFuncionario({
                id: f.id,
                nome,
                especialidade: especialidade || null,
                bio: bio || null,
                foto: urlFinal,
                ativo,
                ordem: Number(ordem) || 0,
              });
              setSalvando(false);
              aoSalvar();
            }}
            disabled={salvando}
            className="btn btn-primary py-2! px-5! text-[0.85rem]! inline-flex items-center gap-1.5"
          >
            <IconSave size={13} /> {salvando ? "..." : "Salvar"}
          </button>
          <button
            onClick={async () => {
              if (!confirm(`Remover ${nome}?`)) return;
              const { adminDeleteFuncionario } = await import("@/lib/actions");
              await adminDeleteFuncionario(f.id!);
              aoSalvar();
            }}
            className="btn btn-danger py-2! px-4! text-[0.8rem]!"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==================== BLOQUEIOS ==================== */

function AbaBloqueios() {
  const [items, setItems] = useState<{ id: string; block_date: string; block_time: string | null; reason: string | null }[] | null>(null);
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [motivo, setMotivo] = useState("");
  const [msg, setMsg] = useState("");

  const carregar = useCallback(async () => {
    const { adminGetBlockedSlots } = await import("@/lib/actions");
    setItems(await adminGetBlockedSlots());
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function adicionar() {
    setMsg("");
    const { adminAddBlockedSlot } = await import("@/lib/actions");
    const r = await adminAddBlockedSlot(data, horario || null, motivo);
    if (r.ok) {
      setMotivo("");
      setMsg("Bloqueio adicionado!");
      carregar();
    } else setMsg(r.erro ?? "Erro.");
  }

  return (
    <div className="max-w-3xl">
      <div className="lux-card p-6 mb-8">
        <h3 className="font-heading text-lg mb-4">Bloquear agenda</h3>
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <input type="date" className="input-lux" value={data} onChange={(e) => setData(e.target.value)} />
          <input className="input-lux" placeholder="Horário (vazio = dia todo)" value={horario} onChange={(e) => setHorario(e.target.value)} />
          <input className="input-lux" placeholder="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={adicionar} disabled={!data} className="btn btn-primary py-2.5! px-6! text-[0.9rem]!">
            Bloquear
          </button>
          {msg && <span className="text-sm text-(--rose-gold-light)">{msg}</span>}
        </div>
      </div>

      {items === null ? (
        <p className="text-(--text-muted)">Carregando bloqueios...</p>
      ) : items.length === 0 ? (
        <p className="text-(--text-muted)">Nenhum bloqueio ativo.</p>
      ) : (
        <div className="space-y-4! md:space-y-3!">
          {items.map((b) => (
            <div key={b.id} className="lux-card p-4 flex items-center gap-4 flex-wrap">
              <strong className="w-32">{new Date(b.block_date + "T12:00:00").toLocaleDateString("pt-BR")}</strong>
              <span className="text-(--rose-gold) w-24">{b.block_time ? b.block_time.slice(0, 5) : "Dia todo"}</span>
              <span className="flex-1 text-sm text-(--text-muted)">{b.reason ?? "-"}</span>
              <button
                onClick={async () => {
                  const { adminRemoveBlockedSlot } = await import("@/lib/actions");
                  await adminRemoveBlockedSlot(b.id);
                  carregar();
                }}
                className="btn btn-danger py-2! px-4! text-[0.8rem]!"
              >
                Liberar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================== HISTÃ“RICO ==================== */

function AbaHistorico() {
  const [items, setItems] = useState<(Appointment & { servico_nome: string | null })[] | null>(null);
  const [filtro, setFiltro] = useState("todos");

  const carregar = useCallback(async () => {
    const { adminGetHistorico } = await import("@/lib/actions");
    setItems(await adminGetHistorico());
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!items) return <p className="text-(--text-muted)">Carregando histórico...</p>;

  const filtrados = filtro === "todos" ? items : items.filter((a) => a.status === filtro);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select className="input-lux w-auto! py-2.5! px-4! text-sm" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="todos">Todos ({items.length})</option>
          <option value="concluido">Concluídos</option>
          <option value="cancelado">Cancelados</option>
          <option value="">Antigos sem status</option>
        </select>
        <button onClick={carregar} className="btn btn-outline py-2.5! px-5! text-[0.85rem]!">
          Atualizar
        </button>
      </div>

      {filtrados.length === 0 ? (
        <p className="text-(--text-muted)">Nada no histórico com esse filtro.</p>
      ) : (
        <div className="space-y-4! md:space-y-3!">
          {filtrados.map((a) => (
            <div key={a.id} className="lux-card p-4 flex items-center gap-4 flex-wrap opacity-90">
              <div className="w-36 shrink-0">
                <strong className="block text-sm">
                  {new Date(a.appointment_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" })}
                </strong>
                <span className="text-(--rose-gold) text-sm">{a.appointment_time.slice(0, 5)}</span>
              </div>
              <div className="flex-1 min-w-[160px]">
                <strong>{a.client_name}</strong>
                <p className="text-sm text-(--text-muted)">{a.servico_nome ?? "Serviço"} â€¢ {a.client_phone}</p>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  a.status === "cancelado"
                    ? "border-red-500/30 text-red-400 bg-red-500/10"
                    : a.status === "concluido"
                      ? "border-green-500/30 text-green-400 bg-green-500/10"
                      : "border-(--border-color-strong) text-(--text-muted)"
                }`}
              >
                {a.status ?? "antigo"}
              </span>
              <a
                href={`https://wa.me/55${a.client_phone.replace(/\D/g, "").replace(/^55/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full flex items-center justify-center bg-white"
                style={{ color: "#25d366" }}
                title="Falar com a cliente"
              >
                <WhatsAppIcon size={18} />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
