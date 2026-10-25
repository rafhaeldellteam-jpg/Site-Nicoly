"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LinkWhatsapp from "@/components/LinkWhatsapp";
import { supabase } from "@/lib/supabase";
import { useModal } from "@/lib/use-modal";
import { ANTECEDENCIA_ALTERACAO_HORAS, podeAlterarPeloSite, type HorarioGrade } from "@/lib/agenda";
import { WhatsAppIcon } from "@/components/icons";

interface MeuAgendamento {
  id: string;
  service_id: number | null;
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

function hojeLocal(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatBR(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

async function tokenAtual(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export default function MeusHorariosPage() {
  const [estado, setEstado] = useState<"carregando" | "semlogin" | "vazio" | "ok" | "erro">("carregando");
  const [itens, setItens] = useState<MeuAgendamento[]>([]);
  const [remarcando, setRemarcando] = useState<MeuAgendamento | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const carregar = useCallback(() => {
    return tokenAtual()
      .then(async (token) => {
        if (!token) {
          setEstado("semlogin");
          return;
        }
        const { getMyAppointments } = await import("@/lib/acoes/agenda");
        const lista = (await getMyAppointments(token)) as MeuAgendamento[];
        setItens(lista);
        setEstado(lista.length === 0 ? "vazio" : "ok");
      })
      .catch(() => setEstado("erro"));
  }, []);

  // o Supabase avisa a sessão atual logo ao assinar (INITIAL_SESSION) e a cada login/saída
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void carregar();
    });
    return () => sub.subscription.unsubscribe();
  }, [carregar]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  async function cancelar(a: MeuAgendamento) {
    if (!confirm(`Cancelar seu horário de ${formatBR(a.appointment_date)} às ${a.appointment_time.slice(0, 5)}?`)) return;
    const token = await tokenAtual();
    if (!token) return setEstado("semlogin");
    try {
      const { clienteCancelarAgendamento } = await import("@/lib/acoes/agenda");
      const r = await clienteCancelarAgendamento(token, a.id);
      setAviso(r.ok ? { tipo: "ok", texto: "Horário cancelado. A Nicoly já foi avisada." } : { tipo: "erro", texto: r.erro ?? "Não foi possível cancelar." });
      if (r.ok) carregar();
    } catch {
      setAviso({ tipo: "erro", texto: "Sem conexão no momento. Tente de novo." });
    }
  }

  const hoje = hojeLocal();
  const futuros = itens.filter((a) => a.appointment_date >= hoje && a.status !== "cancelado" && a.status !== "concluido");
  const passados = itens.filter((a) => !futuros.includes(a));

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[calc(env(safe-area-inset-top)+96px)] md:pt-32 pb-20 md:pb-24">
        <div className="container-x">
          <p className="section-subtitle">Sua conta</p>
          <h1 className="font-heading text-[clamp(1.7rem,6.5vw,3.2rem)] mt-3 mb-2">Meus Horários</h1>
          <p className="text-(--text-muted) mb-10 max-w-xl text-base md:text-lg">
            Acompanhe, remarque ou cancele os horários feitos pelo site com a sua conta.
          </p>

          {aviso && (
            <p
              role={aviso.tipo === "erro" ? "alert" : "status"}
              className={`mb-6 max-w-xl rounded-xl px-4 py-3 text-sm border ${
                aviso.tipo === "erro" ? "text-[#ffc9c9] bg-[#2c1717] border-red-500/40" : "text-[#c7f5d1] bg-[#1c2a20] border-green-500/40"
              }`}
            >
              {aviso.texto}
            </p>
          )}

          {estado === "carregando" && <p className="text-(--text-muted)">Carregando...</p>}

          {estado === "erro" && (
            <div className="lux-card p-8 max-w-md text-center">
              <p className="text-(--text-muted) mb-6">Não foi possível carregar seus horários agora.</p>
              <button onClick={carregar} className="btn btn-outline btn-block">
                Tentar de novo
              </button>
            </div>
          )}

          {estado === "semlogin" && (
            <div className="lux-card p-8 max-w-md text-center">
              <p className="text-(--text-muted) mb-6">Entre com sua conta para ver os horários que você agendou.</p>
              <button onClick={() => window.dispatchEvent(new CustomEvent("abrir-login"))} className="btn btn-primary btn-block">
                Entrar / Criar conta
              </button>
            </div>
          )}

          {estado === "vazio" && (
            <div className="lux-card p-8 max-w-md text-center">
              <p className="text-(--text-muted) mb-6">
                Nenhum horário encontrado para esta conta. Os horários aparecem aqui quando você agenda usando o mesmo e-mail da conta.
              </p>
              <Link href="/catalogo" className="btn btn-primary btn-block">
                Agendar agora
              </Link>
            </div>
          )}

          {estado === "ok" && (
            <div className="space-y-10">
              <section>
                <h2 className="font-heading text-xl text-(--rose-gold-light) mb-1">Próximos</h2>
                <p className="text-xs text-(--text-muted) mb-4">
                  Você pode remarcar ou cancelar pelo site até {ANTECEDENCIA_ALTERACAO_HORAS}h antes do horário.
                </p>
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
                      <CartaoHorario key={a.id} a={a} aoRemarcar={() => setRemarcando(a)} aoCancelar={() => cancelar(a)} />
                    ))}
                  </div>
                )}
              </section>
              {passados.length > 0 && (
                <section>
                  <h2 className="font-heading text-xl text-(--rose-gold-light) mb-4">Histórico</h2>
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

      {remarcando && (
        <RemarcarModal
          agendamento={remarcando}
          aoFechar={() => setRemarcando(null)}
          aoConcluir={(texto) => {
            setRemarcando(null);
            setAviso({ tipo: "ok", texto });
            carregar();
          }}
        />
      )}
    </>
  );
}

function CartaoHorario({
  a,
  aoRemarcar,
  aoCancelar,
}: {
  a: MeuAgendamento;
  aoRemarcar?: () => void;
  aoCancelar?: () => void;
}) {
  const s = STATUS_STYLE[a.status ?? ""] ?? STATUS_STYLE.confirmado;
  const futuro = !!aoRemarcar;
  const podeAlterar = futuro && podeAlterarPeloSite(a.appointment_date, a.appointment_time);
  return (
    <article className="lux-card p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-heading text-lg leading-tight">{a.servico_nome ?? "Atendimento"}</h3>
        <span className="text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap" style={{ color: s.cor, background: s.bg }}>
          {s.label}
        </span>
      </div>
      <p className="text-sm text-(--text-main) first-letter:uppercase">{formatBR(a.appointment_date)}</p>
      <p className="font-heading text-2xl text-(--rose-gold) mt-1">{a.appointment_time.slice(0, 5)}</p>

      {futuro &&
        (podeAlterar ? (
          <div className="flex gap-2 mt-4 pt-4 border-t border-(--border-color)">
            <button className="btn btn-primary flex-1 py-2.5! px-3! text-[0.85rem]!" onClick={aoRemarcar}>
              Remarcar
            </button>
            <button className="btn btn-outline py-2.5! px-4! text-[0.85rem]!" onClick={aoCancelar}>
              Cancelar
            </button>
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t border-(--border-color)">
            <p className="text-xs text-(--text-muted) mb-2">
              Faltam menos de {ANTECEDENCIA_ALTERACAO_HORAS}h. Para mudar, fale com a Nicoly:
            </p>
            <LinkWhatsapp
              origem="meus_horarios"
              message={`Olá! Preciso falar sobre meu horário de ${formatBR(a.appointment_date)} às ${a.appointment_time.slice(0, 5)}.`}
              className="btn btn-outline btn-block py-2.5! text-[0.85rem]!"
            >
              <WhatsAppIcon size={16} /> Falar no WhatsApp
            </LinkWhatsapp>
          </div>
        ))}
    </article>
  );
}

function RemarcarModal({
  agendamento,
  aoFechar,
  aoConcluir,
}: {
  agendamento: MeuAgendamento;
  aoFechar: () => void;
  aoConcluir: (msg: string) => void;
}) {
  const [data, setData] = useState(agendamento.appointment_date);
  // grade e horário valem para o dia em que foram lidos/escolhidos
  const [leitura, setLeitura] = useState<{ data: string; grade: HorarioGrade[] } | null>(null);
  const [escolha, setEscolha] = useState<{ data: string; hora: string } | null>(null);
  const grade = leitura?.data === data ? leitura.grade : null;
  const hora = escolha?.data === data ? escolha.hora : null;
  const setHora = (h: string) => setEscolha({ data, hora: h });
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  useModal(true, aoFechar);

  const dias = useMemo(
    () =>
      Array.from({ length: 21 }, (_, i) => {
        const iso = hojeLocal(i);
        const d = new Date(`${iso}T12:00:00`);
        return {
          iso,
          semana: i === 0 ? "Hoje" : i === 1 ? "Amanhã" : d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
          dia: d.getDate(),
          mes: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        };
      }),
    []
  );

  useEffect(() => {
    let vivo = true;
    import("@/lib/acoes/agenda")
      .then(({ getAvailableSlots }) => getAvailableSlots(data, agendamento.service_id, agendamento.id))
      .then((r) => vivo && setLeitura({ data, grade: r.grade }))
      .catch(() => vivo && setLeitura({ data, grade: [] }));
    return () => {
      vivo = false;
    };
  }, [data, agendamento.service_id, agendamento.id]);

  async function confirmar() {
    if (!hora) return;
    setEnviando(true);
    setErro("");
    try {
      const token = await tokenAtual();
      if (!token) {
        setErro("Entre na sua conta de novo para continuar.");
        return;
      }
      const { clienteRemarcarAgendamento } = await import("@/lib/acoes/agenda");
      const r = await clienteRemarcarAgendamento(token, agendamento.id, data, hora);
      if (r.ok) aoConcluir(`Pronto! Seu horário agora é ${formatBR(data)} às ${hora}.`);
      else setErro(r.erro ?? "Não foi possível remarcar.");
    } catch {
      setErro("Sem conexão no momento. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  const atual = data === agendamento.appointment_date;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="modal-container" role="dialog" aria-modal="true" aria-labelledby="remarcar-titulo">
        <button className="modal-close" onClick={aoFechar} aria-label="Fechar">
          &times;
        </button>
        <div className="p-6 sm:p-8">
          <span className="section-subtitle">Remarcar</span>
          <h3 id="remarcar-titulo" className="font-heading text-2xl mt-1 mb-1">
            {agendamento.servico_nome ?? "Atendimento"}
          </h3>
          <p className="text-sm text-(--text-muted) mb-5">
            Hoje marcado para {formatBR(agendamento.appointment_date)} às {agendamento.appointment_time.slice(0, 5)}.
          </p>

          <div className="form-group">
            <label>Novo dia</label>
            <div className="dias-scroll" role="listbox" aria-label="Novo dia">
              {dias.map((d) => (
                <button
                  key={d.iso}
                  type="button"
                  role="option"
                  aria-selected={data === d.iso}
                  className={`dia-chip ${data === d.iso ? "sel" : ""}`}
                  onClick={() => setData(d.iso)}
                >
                  <small>{d.semana}</small>
                  <strong>{d.dia}</strong>
                  <small>{d.mes}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Novo horário</label>
            <ul className="slot-legenda" aria-label="Legenda">
              <li>
                <i className="livre" /> Disponível
              </li>
              <li>
                <i className="ocupado" /> Indisponível
              </li>
              <li>
                <i className="nao_cabe" /> Não cabe o serviço
              </li>
            </ul>
            {!grade ? (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2" aria-busy="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="slot-skeleton" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 min-[400px]:grid-cols-4 sm:grid-cols-5 gap-2">
                {grade.map((g) => {
                  const ehAtual = atual && g.hora === agendamento.appointment_time.slice(0, 5);
                  const livre = g.situacao === "livre" && !ehAtual;
                  return (
                    <button
                      key={g.hora}
                      type="button"
                      aria-pressed={hora === g.hora}
                      aria-disabled={!livre}
                      title={ehAtual ? "Seu horário atual" : g.motivo}
                      className={`slot-btn s-${ehAtual ? "ocupado" : g.situacao} ${hora === g.hora ? "sel" : ""}`}
                      onClick={() => (livre ? setHora(g.hora) : setErro(ehAtual ? "Este já é o seu horário atual." : `${g.hora}: ${g.motivo ?? "indisponível"}`))}
                    >
                      {g.hora}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {erro && (
            <p className="text-[#ef5350] text-sm mb-4 text-center" role="alert">
              {erro}
            </p>
          )}

          <button className="btn btn-primary btn-block" disabled={!hora || enviando} onClick={confirmar}>
            {enviando ? "Remarcando..." : hora ? `Remarcar para ${hora}` : "Escolha o novo horário"}
          </button>
        </div>
      </div>
    </div>
  );
}
