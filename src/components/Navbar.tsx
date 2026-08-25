"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconHeart } from "@/components/icons";
import LoginModal from "@/components/LoginModal";
import { supabase } from "@/lib/supabase";
import { capturarCampanha } from "@/lib/rastreio";

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
  const [usuario, setUsuario] = useState<{ nome: string; email: string } | null>(null);

  useEffect(() => {
    capturarCampanha();
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    function carregar() {
      supabase.auth.getSession().then(({ data }) => {
        const u = data.session?.user;
        setUsuario(
          u
            ? {
                nome:
                  (u.user_metadata?.nome as string) ||
                  (u.user_metadata?.full_name as string) ||
                  (u.email ?? "").split("@")[0],
                email: u.email ?? "",
              }
            : null
        );
        if (u?.email) boasVindas(u);
      });
    }
    carregar();
    const { data: sub } = supabase.auth.onAuthStateChange(() => carregar());
    return () => sub.subscription.unsubscribe();
  }, []);

  function boasVindas(u: { id?: string; email?: string; user_metadata?: Record<string, string> }) {
    const chave = `nic_boas_vindas_${u.email}`;
    try {
      if (localStorage.getItem(chave)) return;
      localStorage.setItem(chave, "1");
    } catch {
      return;
    }
    void fetch("/api/email/welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: u.user_metadata?.nome || u.user_metadata?.full_name || null,
        email: u.email,
      }),
    }).catch(() => {});
  }

  async function sair() {
    await supabase.auth.signOut();
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
        <Link href="/#inicio" className="flex flex-col items-start shrink-0 leading-none">
          <span className="font-logo text-[1.55rem] md:text-[1.8rem] tracking-[0.5px] whitespace-nowrap">
            <span className="logo-shimmer">Nicbeautty</span>
            <IconHeart size={15} className="inline-block ml-[3px] -mt-[3px] text-(--rose-gold-light)" />
          </span>
          <span className="logo-sub mt-[3px]">- LASH DESIGNER -</span>
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
                Meus Horários
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-2 text-sm text-(--rose-gold) hover:text-(--rose-gold-light) transition-colors"
                title="Meu painel"
                aria-label="Meu painel"
              >
                <span className="w-7 h-7 rounded-full bg-(--bg-tertiary) border border-(--border-color) flex items-center justify-center text-xs font-bold text-(--text-main)">
                  {usuario.nome.trim().charAt(0).toUpperCase()}
                </span>
                <span className="hidden lg:inline">Olá, {usuario.nome.split(" ")[0]}</span>
              </Link>
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
              className="btn btn-outline inline-flex py-1.5! px-3.5! text-[0.82rem]!"
            >
              Entrar
            </button>
          )}
          <button
            aria-label="Menu"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto((v) => !v)}
            className="lg:hidden flex flex-col gap-[4px] p-1.5 -mr-1"
          >
            <span className={`block w-5 h-[2px] bg-(--rose-gold) rounded transition-all ${menuAberto ? "translate-y-[6px] rotate-45" : ""}`} />
            <span className={`block w-5 h-[2px] bg-(--rose-gold) rounded transition-all ${menuAberto ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-[2px] bg-(--rose-gold) rounded transition-all ${menuAberto ? "-translate-y-[6px] -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {/* menu mobile */}
      {menuAberto && (
        <div className="lg:hidden border-t border-(--border-color)" style={{ background: "rgba(10,10,12,0.97)" }}>
          <ul className="container-x py-4 flex flex-col gap-4 text-sm font-medium">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setMenuAberto(false)}
                  className="block py-1 text-(--text-main) hover:text-(--rose-gold)"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
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
                    className="block py-1 text-(--text-main) hover:text-(--rose-gold)"
                  >
                    Meus Horários
                  </Link>
                </li>
                <li className="flex items-center justify-between text-(--text-muted) text-sm px-1">
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
    </>
  );
}
