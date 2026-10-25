"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildWhatsAppLink } from "@/lib/supabase";
import { rastrearCliqueWhatsapp } from "@/lib/rastreio";
import { useModal } from "@/lib/use-modal";
import type { Service } from "@/lib/types";
import { duracaoDoServico, formatarDuracao, type HorarioGrade } from "@/lib/agenda";
import { IconSparkle, IconHeart, WhatsAppIcon } from "@/components/icons";
import Captcha, { captchaAtivo } from "@/components/Captcha";

type Etapa = "form" | "sucesso";

const DIAS_VISIVEIS = 21;

/** Data local (do aparelho) no formato YYYY-MM-DD — evita o erro de fuso do toISOString. */
function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

/** (11) 99999-9999 enquanto a cliente digita. */
function mascararTelefone(v: string): string {
  const n = v.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return n.length ? `(${n}` : "";
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

export default function BookingModal() {
  const [aberto, setAberto] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [data, setData] = useState(() => isoLocal(new Date()));
  const [grade, setGrade] = useState<HorarioGrade[] | null>(null);
  const [duracaoMin, setDuracaoMin] = useState(60);
  const [dica, setDica] = useState("");
  const [slot, setSlot] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [captcha, setCaptcha] = useState("");
  const [novoCaptcha, setNovoCaptcha] = useState(0);
  const [erro, setErro] = useState("");
  const [etapa, setEtapa] = useState<Etapa>("form");
  const [resumo, setResumo] = useState<{ servico: string; data: string; hora: string } | null>(null);

  const dias = useMemo(() => {
    const base = new Date();
    return Array.from({ length: DIAS_VISIVEIS }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      return {
        iso: isoLocal(d),
        semana: i === 0 ? "Hoje" : i === 1 ? "Amanhã" : d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        dia: d.getDate(),
        mes: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      };
    });
  }, []);

  useEffect(() => {
    const abrir = (e: Event) => {
      const detail = (e as CustomEvent).detail as { serviceId?: number } | undefined;
      if (detail?.serviceId) setServiceId(detail.serviceId);
      setAberto(true);
      import("@/lib/supabase").then(({ supabase }) =>
        supabase.auth.getSession().then(({ data }) => {
          const u = data.session?.user;
          if (!u) return;
          setNome((n) => n || (u.user_metadata?.nome as string) || (u.user_metadata?.full_name as string) || "");
          setEmail((e2) => e2 || u.email || "");
          setTelefone((t) => t || mascararTelefone((u.user_metadata?.telefone as string) || ""));
        })
      );
    };
    window.addEventListener("abrir-agendamento", abrir);

    // atalho do app instalado (PWA): /?agendar=1 abre o agendamento direto
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("agendar") === "1" || window.location.hash === "#agendamento") {
        setTimeout(() => window.dispatchEvent(new CustomEvent("abrir-agendamento")), 300);
      }
    } catch {
      /* ignora */
    }

    return () => window.removeEventListener("abrir-agendamento", abrir);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    setErro("");
    let vivo = true;
    import("@/lib/acoes/publico").then(async ({ getServices }) => {
      const lista = await getServices();
      if (!vivo) return;
      setServices(lista);
      setServiceId((atual) => atual ?? lista[0]?.id ?? null);
    });
    return () => {
      vivo = false;
    };
  }, [aberto]);

  // a grade depende do dia e do serviço (o tempo do serviço decide o que "cabe")
  const buscarSlots = useCallback(async () => {
    if (!data) return;
    setCarregando(true);
    setSlot(null);
    setDica("");
    setGrade(null);
    try {
      const { getAvailableSlots } = await import("@/lib/acoes/agenda");
      const r = await getAvailableSlots(data, serviceId);
      setGrade(r.grade);
      setDuracaoMin(r.duracaoMin);
    } catch {
      setGrade([]);
      setErro("Não foi possível ler a agenda. Verifique sua conexão.");
    } finally {
      setCarregando(false);
    }
  }, [data, serviceId]);

  useEffect(() => {
    if (aberto && data && serviceId) buscarSlots();
  }, [aberto, data, serviceId, buscarSlots]);

  const fechar = useCallback(() => {
    setAberto(false);
    setEtapa("form");
    setErro("");
    setResumo(null);
  }, []);

  useModal(aberto, fechar);

  if (!aberto) return null;

  const passo = !serviceId ? 1 : !slot ? 2 : 3;
  const telefoneOk = telefone.replace(/\D/g, "").length >= 10;

  async function confirmar() {
    if (!serviceId || !slot) return;
    setEnviando(true);
    setErro("");
    try {
      const { createAppointment } = await import("@/lib/acoes/agenda");
      const r = await createAppointment({
        nome,
        telefone,
        email,
        serviceId,
        data,
        horario: slot,
        captcha,
      });
      if (!r.ok) {
        setErro(r.erro ?? "Erro ao agendar.");
        // cada token do captcha vale uma vez: pede um novo
        setCaptcha("");
        setNovoCaptcha((n) => n + 1);
        buscarSlots();
        return;
      }
    } catch {
      setErro("Sem conexão no momento. Tente novamente.");
      return;
    } finally {
      setEnviando(false);
    }
    const servico = services.find((s) => s.id === serviceId);
    setResumo({
      servico: servico?.nome ?? "Serviço",
      data: new Date(data + "T12:00:00").toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }),
      hora: slot,
    });
    setEtapa("sucesso");
  }

  const msgWhatsApp =
    resumo &&
    `Olá! Acabei de agendar pelo site:\n✨ *Serviço:* ${resumo.servico}\n📅 *Data:* ${resumo.data}\n⏰ *Horário:* ${resumo.hora}\n👤 *Nome:* ${nome}`;

  const diaForaDaLista = data && !dias.some((d) => d.iso === data);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div className="modal-container" role="dialog" aria-modal="true" aria-labelledby="booking-titulo">
        <button className="modal-close" onClick={fechar} aria-label="Fechar">
          &times;
        </button>
        <div className="p-6 sm:p-8 md:p-10">
          {etapa === "sucesso" && resumo ? (
            <div className="text-center py-4 booking-sucesso">
              <div className="mb-4 flex justify-center text-(--rose-gold) sucesso-icone">
                <IconSparkle size={44} />
              </div>
              <h3 id="booking-titulo" className="font-heading text-3xl text-(--rose-gold) mb-2">
                Agendado com sucesso!
              </h3>
              <p className="text-(--text-muted) mb-1">
                {resumo.servico} • {resumo.data} às <strong className="text-(--text-main)">{resumo.hora}</strong>
              </p>
              <p className="text-sm text-(--text-muted) mb-7">
                Toque abaixo para confirmar com a Nicoly no WhatsApp.
              </p>
              <a
                href={buildWhatsAppLink(msgWhatsApp ?? undefined)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => rastrearCliqueWhatsapp("pos_agendamento")}
                className="btn btn-primary btn-block"
              >
                <WhatsAppIcon size={18} /> Confirmar no WhatsApp
              </a>
            </div>
          ) : (
            <>
              <span className="section-subtitle">Agendamento Online</span>
              <h3 id="booking-titulo" className="font-heading text-3xl mt-1 mb-4">
                Escolha seu momento
              </h3>

              {/* progresso */}
              <ol className="booking-passos" aria-label="Etapas do agendamento">
                {["Serviço", "Data e horário", "Seus dados"].map((t, i) => (
                  <li key={t} className={i + 1 < passo ? "feito" : i + 1 === passo ? "atual" : ""}>
                    <span>{i + 1}</span>
                    {t}
                  </li>
                ))}
              </ol>

              <div className="form-group">
                <label htmlFor="bk-servico">Serviço *</label>
                <select
                  id="bk-servico"
                  className="input-lux"
                  value={serviceId ?? ""}
                  onChange={(e) => setServiceId(Number(e.target.value))}
                >
                  {services.length === 0 && <option>Carregando...</option>}
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} — {formatarDuracao(duracaoDoServico(s))}
                      {s.preco != null ? ` · R$ ${Number(s.preco).toFixed(2).replace(".", ",")}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label id="bk-data-label">Data *</label>
                <div className="dias-scroll" role="listbox" aria-labelledby="bk-data-label">
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
                <details className="mt-2 text-sm text-(--text-muted)" open={!!diaForaDaLista}>
                  <summary className="cursor-pointer hover:text-(--rose-gold)">Outra data</summary>
                  <input
                    className="input-lux mt-2"
                    type="date"
                    aria-label="Escolher outra data"
                    min={dias[0]?.iso}
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                  />
                </details>
              </div>

              <div className="form-group">
                <label>Horários *</label>
                <ul className="slot-legenda" aria-label="Legenda dos horários">
                  <li><i className="livre" /> Disponível</li>
                  <li><i className="ocupado" /> Indisponível</li>
                  <li><i className="nao_cabe" /> Não cabe o serviço ({formatarDuracao(duracaoMin)})</li>
                </ul>
                {!grade || carregando ? (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2" aria-busy="true" aria-label="Lendo a agenda">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="slot-skeleton" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 min-[400px]:grid-cols-4 sm:grid-cols-5 gap-2">
                      {grade.map((g) => {
                        const livre = g.situacao === "livre";
                        return (
                          <button
                            key={g.hora}
                            type="button"
                            aria-pressed={slot === g.hora}
                            aria-disabled={!livre}
                            title={g.motivo}
                            className={`slot-btn s-${g.situacao} ${slot === g.hora ? "sel" : ""}`}
                            onClick={() => {
                              if (livre) {
                                setSlot(g.hora);
                                setDica("");
                              } else {
                                setDica(`${g.hora}: ${g.motivo ?? "Horário indisponível."}`);
                              }
                            }}
                          >
                            {g.hora}
                          </button>
                        );
                      })}
                    </div>
                    {dica && (
                      <p className="slot-dica" role="status">
                        {dica}
                      </p>
                    )}
                    {grade.length > 0 && !grade.some((g) => g.situacao === "livre") && (
                      <p className="text-(--text-muted) text-sm pt-3 text-center w-full">
                        Nenhum horário livre para este serviço nesta data. Escolha outro dia{" "}
                        <IconHeart size={13} className="inline-block -mt-[2px] text-(--rose-gold)" />
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <div className="form-group">
                  <label htmlFor="bk-nome">Nome *</label>
                  <input
                    id="bk-nome"
                    className="input-lux"
                    placeholder="Seu nome"
                    autoComplete="name"
                    maxLength={80}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="bk-tel">WhatsApp *</label>
                  <input
                    id="bk-tel"
                    className="input-lux"
                    placeholder="(11) 99999-9999"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    maxLength={16}
                    value={telefone}
                    onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="bk-email">E-mail (opcional — para receber a confirmação)</label>
                <input
                  id="bk-email"
                  className="input-lux"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  maxLength={100}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <Captcha aoValidar={setCaptcha} reiniciar={novoCaptcha} />

              {erro && (
                <p className="text-[#ef5350] text-sm mb-4 text-center" role="alert">
                  {erro}
                </p>
              )}

              <button
                className="btn btn-primary btn-block"
                disabled={!slot || nome.trim().length < 3 || !telefoneOk || enviando || (captchaAtivo && !captcha)}
                onClick={confirmar}
              >
                {enviando ? "Agendando..." : slot ? `Confirmar para às ${slot}` : "Escolha um horário"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
