"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoginModal from "@/components/LoginModal";
import { supabase } from "@/lib/supabase";

interface MeuAgendamento {
  id: string;
  servico_nome: string | null;
  appointment_date: string;
  appointment_time: string;
  status: string | null;
}

const STATUS_STYLE: Record<string, { label: string; cor: string; bg: string }> = {
  confirmado: { label: "Confirmado", cor: "#d8a37d", bg: "rgba(216,163,125,0.15)" },
  concluido: { label: "Concluído", cor: "#7bd88f", bg: "rgba(123,216,143,0.12)" },
  cancelado: { label: "Cancelado", cor: "#ef5350", bg: "rgba(239,83,80,0.12)" },
};

function formatBR(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function MeusHorariosPage() {
  const [estado, setEstado] = useState<"carregando" | "semlogin" | "vazio" | "ok">("carregando");
  const [itens, setItens] = useState<MeuAgendamento[]>([]);

  const carregar = useCallback(async () => {
    setEstado("carregando");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setEstado("semlogin");
      return;
    }
    const { getMyAppointments } = await import("@/lib/actions");
    const lista = await getMyAppointments(token);
    setItens(lista);
    setEstado(lista.length === 0 ? "vazio" : "ok");
  }, []);

  useEffect(() => {
    carregar();
    const { data: sub } = supabase.auth.onAuthStateChange(() => carregar());
    return () => sub.subscription.unsubscribe();
  }, [carregar]);

  const futuros = itens.filter((a) => a.appointment_date >= new Date().toISOString().split("T")[0] && a.status !== "cancelado");
  const passados = itens.filter((a) => !(a.appointment_date >= new Date().toISOString().split("T")[0] && a.status !== "cancelado"));

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[calc(env(safe-area-inset-top)+96px)] md:pt-32 pb-20 md:pb-24">
        <div className="container-x">
          <p className="section-subtitle">Sua conta</p>
          <h1 className="font-heading text-[clamp(1.7rem,6.5vw,3.2rem)] mt-3 mb-2">Meus Horários</h1>
          <p className="text-(--text-muted) mb-10 max-w-xl text-base md:text-lg">
            Acompanhe seus agendamentos feitos pelo site com a sua conta.
          </p>

          {estado === "carregando" && <p className="text-(--text-muted)">Carregando...</p>}

          {estado === "semlogin" && (
            <div className="lux-card p-8 max-w-md text-center">
              <p className="text-(--text-muted) mb-6">
                Entre com sua conta para ver os horários que você agendou.
              </p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("abrir-login"))}
                className="btn btn-primary btn-block"
              >
                Entrar / Criar conta
              </button>
            </div>
          )}

          {estado === "vazio" && (
            <div className="lux-card p-8 max-w-md text-center">
              <p className="text-(--text-muted) mb-6">
                Nenhum horário encontrado para esta conta ainda.
              </p>
              <Link href="/catalogo" className="btn btn-primary btn-block">
                Agendar agora
              </Link>
            </div>
          )}

          {estado === "ok" && (
            <div className="space-y-10">
              <section>
                <h2 className="font-heading text-xl text-(--rose-gold-light) mb-4">Próximos</h2>
                {futuros.length === 0 ? (
                  <p className="text-(--text-muted)">
                    Nenhum horário futuro.{" "}
                    <Link href="/catalogo" className="text-(--rose-gold) underline underline-offset-4">
                      Agendar
                    </Link>
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-4">
                    {futuros.map((a) => (
                      <CartaoHorario key={a.id} a={a} />
                    ))}
                  </div>
                )}
              </section>
              {passados.length > 0 && (
                <section>
                  <h2 className="font-heading text-xl text-(--rose-gold-light) mb-4">
                    Histórico
                  </h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-4">
                    {passados.slice(0, 9).map((a) => (
                      <CartaoHorario key={a.id} a={a} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <LoginModal />
    </>
  );
}

function CartaoHorario({ a }: { a: MeuAgendamento }) {
  const s = STATUS_STYLE[a.status ?? ""] ?? STATUS_STYLE.confirmado;
  return (
    <article className="lux-card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-heading text-lg leading-tight">{a.servico_nome ?? "Atendimento"}</h3>
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap"
          style={{ color: s.cor, background: s.bg }}
        >
          {s.label}
        </span>
      </div>
      <p className="text-sm text-(--text-main)">{formatBR(a.appointment_date)}</p>
      <p className="font-heading text-2xl text-(--rose-gold) mt-1">{a.appointment_time.slice(0, 5)}</p>
    </article>
  );
}
