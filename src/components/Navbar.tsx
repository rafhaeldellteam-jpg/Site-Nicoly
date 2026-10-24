"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconHeart } from "@/components/icons";
import LoginModal from "@/components/LoginModal";
import BookingModal from "@/components/BookingModal";
import MobileCTA from "@/components/MobileCTA";
import NovidadesPopup from "@/components/NovidadesPopup";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin-emails";
import { syncAuthCookie } from "@/lib/auth-cookie";
import { capturarCampanha } from "@/lib/rastreio";
import { AdminAvatar } from "@/components/admin/shared";

const LINKS = [
  { href: "/#inicio", label: "Início" },
  { href: "/#sobre", label: "Diferenciais" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/planos", label: "Planos" },
  { href: "/#galeria", label: "Galeria" },
  { href: "/#contato", label: "Contato" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [usuario, setUsuario] = useState<{
    nome: string;
    email: string;
    foto: string | null;
  } | null>(null);

  useEffect(() => {
    capturarCampanha();
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // menu mobile: fecha com Esc e trava a rolagem do fundo enquanto aberto
  useEffect(() => {
    if (!menuAberto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuAberto(false);
    const fechaSeDesktop = () => window.innerWidth >= 1024 && setMenuAberto(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", fechaSeDesktop);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", fechaSeDesktop);
    };
  }, [menuAberto]);

  useEffect(() => {
    function carregar() {
      supabase.auth.getSession().then(({ data }) => {
        syncAuthCookie(data.session);
        const u = data.session?.user;
        setUsuario(
          u
            ? {
                nome:
                  (u.user_metadata?.nome as string) ||
                  (u.user_metadata?.full_name as string) ||
                  (u.email ?? "").split("@")[0] ||
                  "?",
                email: u.email ?? "",
                foto:
                  (u.user_metadata?.avatar_url as string) ||
                  (u.user_metadata?.picture as string) ||
                  null,
              }
            : null
        );
        if (u?.email && data.session) boasVindas(u.email, data.session.access_token);
      });
    }
    carregar();
    const { data: sub } = supabase.auth.onAuthStateChange(() => carregar());
    return () => sub.subscription.unsubscribe();
  }, []);

  function boasVindas(email: string, token: string) {
    const chave = `nic_boas_vindas_${email}`;
    try {
      if (localStorage.getItem(chave)) return;
      localStorage.setItem(chave, "1");
    } catch {
      return;
    }
    // o servidor descobre o e-mail pelo token — não aceita destinatário digitado
    void fetch("/api/email/welcome", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }

  async function sair() {
    await supabase.auth.signOut();
    syncAuthCookie(null);
    setUsuario(null);
  }

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-[500] transition-all duration-300"
        style={{
          background: scrolled ? "rgba(10,10,12,0.94)" : "rgba(10,10,12,0.82)",
          boxShadow: scrolled ? "0 10px 30px rgba(0,0,0,0.7)" : "none",
          backdropFilter: "blur(12px)",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
      <div className="container-x flex items-center justify-between h-[64px] md:h-[76px]">
        <Link
          href="/#inicio"
          className="logo-nav group flex flex-col items-start shrink-0 leading-none"
          aria-label="Nicbeautty — voltar ao início"
        >
          <span className="font-logo text-[1.3rem] min-[380px]:text-[1.55rem] md:text-[1.8rem] tracking-[0.5px] whitespace-nowrap">
            <span className="logo-shimmer logo-entrada">Nicbeautty</span>
            <IconHeart size={15} className="logo-coracao inline-block ml-[3px] -mt-[3px] text-(--rose-gold-light)" />
          </span>
          <span className="logo-sub logo-sub-anim mt-[3px]">- LASH DESIGNER -</span>
        </Link>

        <ul className="hidden lg:flex items-center gap-7 text-sm font-medium text-(--text-muted)">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="transition-colors hover:text-(--rose-gold)"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {usuario ? (
            <>
              <Link
                href="/meus-horarios"
                className="hidden lg:inline-block text-sm text-(--text-muted) hover:text-(--rose-gold) transition-colors"
              >
                Minha Conta
              </Link>
              <Link
                href="/meus-horarios"
                className="flex items-center gap-2 text-sm text-(--rose-gold) hover:text-(--rose-gold-light) transition-colors"
                title="Minha conta"
                aria-label="Minha conta"
              >
                <AdminAvatar foto={usuario.foto} nome={usuario.nome} size={28} />
                <span className="hidden lg:inline">Olá, {usuario.nome.split(" ")[0]}</span>
              </Link>
              {isAdminEmail(usuario.email) && (
                <Link
                  href="/admin"
                  className="hidden lg:inline-block text-sm text-(--text-muted) hover:text-(--rose-gold) transition-colors"
                >
                  Painel
                </Link>
              )}
              <button
                onClick={sair}
                className="btn btn-outline hidden lg:inline-flex py-2! px-4! text-[0.8rem]!"
              >
                Sair
              </button>
            </>
          ) : (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("abrir-login"))}
              className="btn btn-outline inline-flex py-1.5! px-3! min-[380px]:px-3.5! text-[0.8rem]! min-h-0!"
            >
              Entrar
            </button>
          )}
          <button
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuAberto}
            aria-controls="menu-mobile"
            onClick={() => setMenuAberto((v) => !v)}
            className="lg:hidden flex flex-col justify-center items-center gap-[4px] w-11 h-11 -mr-2"
          >
            <span className={`block w-5 h-[2px] bg-(--rose-gold) rounded transition-all ${menuAberto ? "translate-y-[6px] rotate-45" : ""}`} />
            <span className={`block w-5 h-[2px] bg-(--rose-gold) rounded transition-all ${menuAberto ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-[2px] bg-(--rose-gold) rounded transition-all ${menuAberto ? "-translate-y-[6px] -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {/* menu mobile */}
      {menuAberto && (
        <div
          id="menu-mobile"
          className="menu-mobile lg:hidden border-t border-(--border-color) overflow-y-auto"
          style={{
            background: "rgba(10,10,12,0.97)",
            maxHeight: "calc(100dvh - 64px - env(safe-area-inset-top))",
          }}
        >
          <ul className="container-x py-4 flex flex-col gap-1 text-base font-medium">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setMenuAberto(false)}
                  className="block py-3 border-b border-white/5 text-(--text-main) hover:text-(--rose-gold)"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="pt-3">
              <button
                onClick={() => {
                  setMenuAberto(false);
                  window.dispatchEvent(new CustomEvent("abrir-agendamento"));
                }}
                className="btn btn-primary btn-block py-3!"
              >
                Agendar Horário
              </button>
            </li>
            {usuario ? (
              <>
                <li>
                  <Link
                    href="/meus-horarios"
                    onClick={() => setMenuAberto(false)}
                    className="block py-3 border-b border-white/5 text-(--text-main) hover:text-(--rose-gold)"
                  >
                    Minha Conta
                  </Link>
                </li>
                {isAdminEmail(usuario.email) && (
                  <li>
                    <Link
                      href="/admin"
                      onClick={() => setMenuAberto(false)}
                      className="block py-3 border-b border-white/5 text-(--text-main) hover:text-(--rose-gold)"
                    >
                      Painel Admin
                    </Link>
                  </li>
                )}
                <li className="flex items-center justify-between text-(--text-muted) text-sm px-1 py-3">
                  <span>Olá, {usuario.nome.split(" ")[0]}</span>
                  <button onClick={sair} className="text-(--rose-gold)">Sair</button>
                </li>
              </>
            ) : (
              <li>
                <button
                  onClick={() => {
                    setMenuAberto(false);
                    window.dispatchEvent(new CustomEvent("abrir-login"));
                  }}
                  className="btn btn-outline btn-block py-3!"
                >
                  Entrar / Criar conta
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
      </nav>
      <LoginModal />
      <BookingModal />
      <MobileCTA />
      <NovidadesPopup />
    </>
  );
}
