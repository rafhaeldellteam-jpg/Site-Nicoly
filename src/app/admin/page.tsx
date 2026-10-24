"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin-emails";
import { syncAuthCookie } from "@/lib/auth-cookie";
import { AvisosProvider } from "@/components/admin/ui";
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

const ABA_SALVA = "nic_admin_aba";

export default function AdminPage() {
  const [estado, setEstado] = useState<"carregando" | "login" | "negado" | "ok">("carregando");
  const [erroLogin, setErroLogin] = useState(false);
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    function checar() {
      supabase.auth.getSession().then(({ data }) => {
        // o servidor confere este token em todas as ações do painel
        syncAuthCookie(data.session);
        const email = data.session?.user?.email ?? "";
        if (!email) setEstado("login");
        else if (!isAdminEmail(email)) setEstado("negado");
        else setEstado("ok");
      });
    }
    checar();
    const { data: sub } = supabase.auth.onAuthStateChange(() => checar());
    return () => sub.subscription.unsubscribe();
  }, []);

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEntrando(true);
    const fd = new FormData(e.currentTarget);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("senha") ?? ""),
    });
    setEntrando(false);
    const emailLogado = data.session?.user?.email ?? "";
    syncAuthCookie(data.session);
    if (!error && !!data.session && isAdminEmail(emailLogado)) {
      setEstado("ok");
      setErroLogin(false);
    } else {
      setErroLogin(true);
    }
  }

  if (estado === "carregando")
    return <main className="min-h-[100svh] flex items-center justify-center text-(--text-muted)">Carregando...</main>;

  if (estado !== "ok")
    return (
      <main className="min-h-[100svh] flex items-center justify-center px-5">
        <div className="lux-card p-7 sm:p-10 w-full max-w-sm">
          <h1 className="font-heading text-3xl text-center mb-1">
            Painel <span className="text-(--rose-gold)">Nicbeautty</span>
          </h1>
          <p className="text-center text-xs tracking-[3px] uppercase text-(--text-muted) mb-8">Acesso restrito</p>

          {estado === "negado" ? (
            <>
              <p className="text-center text-(--text-muted) text-sm mb-6">Esta conta não tem permissão de administradora.</p>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  syncAuthCookie(null);
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
                <label htmlFor="adm-email">E-mail</label>
                <input id="adm-email" name="email" type="email" className="input-lux" required autoComplete="username" />
              </div>
              <div className="form-group">
                <label htmlFor="adm-senha">Senha</label>
                <input id="adm-senha" name="senha" type="password" className="input-lux" required autoComplete="current-password" />
              </div>
              {erroLogin && (
                <p className="text-[#ef5350] text-sm text-center mb-3" role="alert">
                  E-mail ou senha incorretos.
                </p>
              )}
              <button className="btn btn-primary btn-block mt-2" disabled={entrando}>
                {entrando ? "Entrando..." : "Entrar"}
              </button>
              <p className="text-center text-xs text-(--text-muted) mt-4">Apenas administradoras autorizadas.</p>
            </form>
          )}
          <Link href="/" className="block text-center text-sm text-(--text-muted) hover:text-(--rose-gold) mt-6">
            ← Voltar ao site
          </Link>
        </div>
      </main>
    );

  return (
    <AvisosProvider>
      <Painel />
    </AvisosProvider>
  );
}

function Painel() {
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
        const { adminDashboard } = await import("@/lib/actions");
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
          <span className="adm-menu-logo" aria-hidden="true">
            ♥
          </span>
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
          <div className="min-w-0">
            <h1 className="font-heading text-xl md:text-2xl truncate">{atual.titulo}</h1>
            <p className="text-xs md:text-sm text-(--text-muted) truncate">{atual.subtitulo}</p>
          </div>
        </header>

        <div className="adm-pagina">
          {aba === "dashboard" && <AbaDashboard irPara={irPara} />}
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
