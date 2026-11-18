"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import LoginPainel from "@/components/admin/LoginPainel";
import { supabase } from "@/lib/supabase";
import { syncAuthCookie } from "@/lib/auth-cookie";
import { AvisosProvider } from "@/components/admin/ui";
import { AdminAvatar, LogoSite } from "@/components/admin/shared";
import { ATALHOS_CELULAR, GRUPOS, IconeMenu, MENU, type Aba } from "@/components/admin/navegacao";

/* Cada aba é carregada só quando aberta — o painel abre mais rápido no celular. */
const carregando = () => <p className="text-(--text-muted) text-sm">Carregando...</p>;
const AbaDashboard = dynamic(() => import("@/components/admin/abas/Dashboard"), { loading: carregando });
const AbaAgendamentos = dynamic(() => import("@/components/admin/abas/Agendamentos"), { loading: carregando });
const AbaBloqueios = dynamic(() => import("@/components/admin/abas/Bloqueios"), { loading: carregando });
const AbaHistorico = dynamic(() => import("@/components/admin/abas/Historico"), { loading: carregando });
const AbaPlanos = dynamic(() => import("@/components/admin/abas/Planos"), { loading: carregando });
const AbaClientes = dynamic(() => import("@/components/admin/abas/Clientes"), { loading: carregando });
const AbaAvaliacoes = dynamic(() => import("@/components/admin/abas/Avaliacoes"), { loading: carregando });
const AbaCatalogo = dynamic(() => import("@/components/admin/abas/Catalogo"), { loading: carregando });
const AbaNovidades = dynamic(() => import("@/components/admin/abas/Novidades"), { loading: carregando });
const AbaGaleria = dynamic(() => import("@/components/admin/abas/Galeria"), { loading: carregando });
const AbaEquipe = dynamic(() => import("@/components/admin/abas/Equipe"), { loading: carregando });
const AbaMarketing = dynamic(() => import("@/components/admin/abas/Marketing"), { loading: carregando });
const AbaFinanceiro = dynamic(() => import("@/components/admin/abas/Financeiro"), { loading: carregando });
const AbaCliques = dynamic(() => import("@/components/admin/abas/Cliques"), { loading: carregando });

const ABA_SALVA = "nic_admin_aba";

/** Pergunta ao servidor se a conta logada está ativa na tabela de administradoras. */
async function verificarAcesso(): Promise<boolean> {
  try {
    const { souAdmin } = await import("@/lib/acoes/acesso");
    return await souAdmin();
  } catch {
    return false;
  }
}

type Perfil = { nome: string; email: string; foto: string | null };

/** Nome e foto de quem está logada (a foto vem do Google, quando a conta é Google). */
function perfilDe(user: { email?: string; user_metadata?: Record<string, unknown> } | null | undefined): Perfil | null {
  if (!user?.email) return null;
  const m = user.user_metadata ?? {};
  const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    nome: texto(m.nome) ?? texto(m.full_name) ?? texto(m.name) ?? user.email.split("@")[0],
    email: user.email,
    foto: texto(m.avatar_url) ?? texto(m.picture),
  };
}

export default function AdminPage() {
  const [estado, setEstado] = useState<"carregando" | "login" | "negado" | "ok">("carregando");
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  // chegou pelo link "redefinir senha" do e-mail
  const [recuperando, setRecuperando] = useState(false);
  const [bemVinda, setBemVinda] = useState(false);

  const checar = useCallback(() => {
    supabase.auth.getSession().then(({ data }) => {
      // o servidor confere este token em todas as ações do painel
      syncAuthCookie(data.session);
      setPerfil(perfilDe(data.session?.user));
      const email = data.session?.user?.email ?? "";
      if (!email) {
        setEstado("login");
        return;
      }
      // quem é administradora fica na tabela "administradores" do Supabase
      verificarAcesso().then((ok) => setEstado(ok ? "ok" : "negado"));
    });
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "PASSWORD_RECOVERY") setRecuperando(true);
      checar();
    });
    return () => sub.subscription.unsubscribe();
  }, [checar]);

  if (estado === "carregando")
    return (
      <main className="min-h-[100svh] flex flex-col items-center justify-center gap-5 text-(--text-muted)">
        <div className="login-logo">
          <span className="login-logo-anel" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" width={64} height={64} />
        </div>
        <span className="text-sm">Abrindo o painel...</span>
      </main>
    );

  if (estado !== "ok" || recuperando)
    return (
      <LoginPainel
        negado={estado === "negado" && !recuperando}
        recuperando={recuperando}
        aoEntrar={() => {
          setBemVinda(true);
          checar();
        }}
        aoSenhaNova={() => {
          setRecuperando(false);
          setBemVinda(true);
          checar();
        }}
      />
    );

  return (
    <AvisosProvider>
      {bemVinda && <BoasVindas nome={perfil?.nome} aoTerminar={() => setBemVinda(false)} />}
      <Painel perfil={perfil} />
    </AvisosProvider>
  );
}

/** Tela rápida de boas-vindas logo depois do login. */
function BoasVindas({ nome, aoTerminar }: { nome?: string; aoTerminar: () => void }) {
  useEffect(() => {
    const t = setTimeout(aoTerminar, 1700);
    return () => clearTimeout(t);
  }, [aoTerminar]);
  return (
    <div className="adm-bemvinda" aria-live="polite">
      <div className="login-logo grande">
        <span className="login-logo-anel" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={96} height={96} />
      </div>
      <p className="font-heading">
        Olá, <span className="ouro-texto">{nome?.split(" ")[0] ?? "Nicoly"}</span>
      </p>
      <small>Preparando seu painel...</small>
    </div>
  );
}

function Painel({ perfil: perfilInicial }: { perfil: Perfil | null }) {
  const [perfil, setPerfil] = useState<Perfil | null>(perfilInicial);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  // troca a foto de perfil da conta logada (vale também para o avatar do site)
  async function trocarFoto(arquivo: File | undefined) {
    if (!arquivo || !perfil) return;
    if (arquivo.size > 5 * 1024 * 1024) {
      alert("A foto precisa ter até 5MB.");
      return;
    }
    setEnviandoFoto(true);
    try {
      const { uploadFuncionarioFoto } = await import("@/lib/acoes/admin-site");
      const up = await uploadFuncionarioFoto(arquivo);
      if (!up.url) {
        alert(up.erro ?? "Não foi possível enviar a foto.");
        return;
      }
      const { error } = await supabase.auth.updateUser({ data: { avatar_url: up.url } });
      if (error) alert("Não foi possível salvar a foto no perfil.");
      else setPerfil({ ...perfil, foto: up.url });
    } catch {
      alert("Sem conexão no momento. Tente de novo.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  const [aba, setAbaEstado] = useState<Aba>(() => {
    try {
      const salva = sessionStorage.getItem(ABA_SALVA) as Aba | null;
      if (salva && MENU.some((m) => m.id === salva)) return salva;
    } catch {
      /* ignora */
    }
    return "dashboard";
  });
  const [menuAberto, setMenuAberto] = useState(false);
  const [pendencias, setPendencias] = useState<Partial<Record<Aba, number>>>({});

  const irPara = useCallback((nova: Aba) => {
    setAbaEstado(nova);
    setMenuAberto(false);
    try {
      sessionStorage.setItem(ABA_SALVA, nova);
    } catch {
      /* ignora */
    }
    window.scrollTo({ top: 0 });
  }, []);

  // números de pendências no menu (avaliações e planos esperando a Nicoly)
  useEffect(() => {
    let vivo = true;
    const buscar = async () => {
      try {
        const { adminDashboard } = await import("@/lib/acoes/admin-agenda");
        const d = await adminDashboard();
        if (vivo) setPendencias({ avaliacoes: d.avaliacoes_pendentes, planos: d.planos_pendentes });
      } catch {
        /* ignora */
      }
    };
    buscar();
    const t = setInterval(buscar, 120000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [aba]);

  useEffect(() => {
    if (!menuAberto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuAberto(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuAberto]);

  const atual = MENU.find((m) => m.id === aba) ?? MENU[0];

  async function sair() {
    await supabase.auth.signOut();
    syncAuthCookie(null);
    location.reload();
  }

  return (
    <div className="adm-layout">
      {/* menu lateral (no celular vira gaveta) */}
      <aside className={`adm-menu ${menuAberto ? "aberto" : ""}`} aria-label="Menu do painel">
        <div className="adm-menu-topo">
          <LogoSite size={40} />
          <div className="min-w-0">
            <strong className="font-heading text-lg leading-tight block">Nicbeautty</strong>
            <span className="text-[0.62rem] uppercase tracking-[2.5px] text-(--text-muted)">Painel admin</span>
          </div>
          <button className="adm-icone-btn ml-auto lg:hidden" onClick={() => setMenuAberto(false)} aria-label="Fechar menu">
            &times;
          </button>
        </div>
        <nav className="adm-menu-lista">
          {GRUPOS.map((g) => (
            <div key={g.titulo} className="mb-4">
              <p className="adm-menu-grupo">{g.titulo}</p>
              {g.itens.map((item) => (
                <button
                  key={item.id}
                  onClick={() => irPara(item.id)}
                  className={`adm-menu-item ${aba === item.id ? "on" : ""}`}
                  aria-current={aba === item.id ? "page" : undefined}
                >
                  <IconeMenu>{item.icone}</IconeMenu>
                  <span className="flex-1 text-left">{item.rotulo}</span>
                  {!!pendencias[item.id] && <span className="adm-contador">{pendencias[item.id]}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="adm-menu-rodape">
          {perfil && (
            <div className="adm-perfil">
              <label className="adm-perfil-foto" title="Trocar foto de perfil">
                <AdminAvatar foto={perfil.foto} nome={perfil.nome} size={44} />
                <span aria-hidden="true">{enviandoFoto ? "…" : "✎"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  disabled={enviandoFoto}
                  onChange={(e) => {
                    trocarFoto(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                  aria-label="Trocar foto de perfil"
                />
              </label>
              <div className="min-w-0">
                <strong className="block truncate text-sm">{perfil.nome}</strong>
                <span className="block truncate text-xs text-(--text-muted)">{perfil.email}</span>
                <span className="block text-[0.7rem] text-(--rose-gold)">{enviandoFoto ? "Enviando foto..." : "Toque na foto para trocar"}</span>
              </div>
            </div>
          )}
          <Link href="/" className="adm-menu-item" target="_blank">
            <IconeMenu>
              <>
                <path d="M15 3h6v6" />
                <path d="M10 14 21 3" />
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              </>
            </IconeMenu>
            Ver o site
          </Link>
          <button onClick={sair} className="adm-menu-item sair">
            <IconeMenu>
              <>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </>
            </IconeMenu>
            Sair
          </button>
        </div>
      </aside>
      {menuAberto && <div className="adm-menu-fundo lg:hidden" onClick={() => setMenuAberto(false)} />}

      <main className="adm-conteudo">
        <header className="adm-topo">
          <button className="adm-icone-btn lg:hidden" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
            <IconeMenu size={22}>
              <>
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </>
            </IconeMenu>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-xl md:text-2xl truncate">{atual.titulo}</h1>
            <p className="text-xs md:text-sm text-(--text-muted) truncate">{atual.subtitulo}</p>
          </div>
          {perfil && (
            <button
              type="button"
              className="lg:hidden shrink-0 rounded-full"
              onClick={() => setMenuAberto(true)}
              aria-label={`Conta de ${perfil.nome}`}
              title={perfil.email}
            >
              <AdminAvatar foto={perfil.foto} nome={perfil.nome} size={36} />
            </button>
          )}
        </header>

        <div className="adm-pagina">
          {aba === "dashboard" && <AbaDashboard irPara={irPara} nome={perfil?.nome} />}
          {aba === "agendamentos" && <AbaAgendamentos />}
          {aba === "bloqueios" && <AbaBloqueios />}
          {aba === "historico" && <AbaHistorico />}
          {aba === "planos" && <AbaPlanos />}
          {aba === "clientes" && <AbaClientes />}
          {aba === "avaliacoes" && <AbaAvaliacoes />}
          {aba === "catalogo" && <AbaCatalogo />}
          {aba === "novidades" && <AbaNovidades />}
          {aba === "galeria" && <AbaGaleria />}
          {aba === "funcionarios" && <AbaEquipe />}
          {aba === "marketing" && <AbaMarketing />}
          {aba === "financeiro" && <AbaFinanceiro irPara={irPara} />}
          {aba === "cliques" && <AbaCliques />}
        </div>
      </main>

      {/* barra inferior no celular */}
      <nav className="adm-barra-inferior lg:hidden" aria-label="Atalhos">
        {ATALHOS_CELULAR.map((id) => {
          const item = MENU.find((m) => m.id === id)!;
          return (
            <button key={id} onClick={() => irPara(id)} className={aba === id ? "on" : ""} aria-current={aba === id ? "page" : undefined}>
              <IconeMenu size={21}>{item.icone}</IconeMenu>
              <span>{item.rotulo}</span>
            </button>
          );
        })}
        <button onClick={() => setMenuAberto(true)} className={!ATALHOS_CELULAR.includes(aba) ? "on" : ""}>
          <IconeMenu size={21}>
            <>
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </>
          </IconeMenu>
          <span>Mais</span>
          {!!((pendencias.avaliacoes ?? 0) + (pendencias.planos ?? 0)) && <i className="adm-ponto" aria-label="Há pendências" />}
        </button>
      </nav>
    </div>
  );
}
