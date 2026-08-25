"use client";

import { useCallback, useEffect, useState } from "react";
import { buildWhatsAppLink } from "@/lib/supabase";
import { rastrearCliqueWhatsapp } from "@/lib/rastreio";
import type { Service } from "@/lib/types";
import { IconSparkle, IconHeart, WhatsAppIcon } from "@/components/icons";

type Etapa = "form" | "sucesso";

export default function BookingModal() {
  const [aberto, setAberto] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [data, setData] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [etapa, setEtapa] = useState<Etapa>("form");
  const [resumo, setResumo] = useState<{ servico: string; data: string; hora: string } | null>(null);

  useEffect(() => {
    const hoje = new Date().toISOString().split("T")[0];
    setData(hoje);

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
          setTelefone((t) => t || (u.user_metadata?.telefone as string) || "");
        })
      );
    };
    window.addEventListener("abrir-agendamento", abrir);
    return () => window.removeEventListener("abrir-agendamento", abrir);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    setErro("");
    let vivo = true;
    import("@/lib/actions").then(async ({ getServices }) => {
      const lista = await getServices();
      if (!vivo) return;
      setServices(lista);
      setServiceId((atual) => atual ?? lista[0]?.id ?? null);
    });
    return () => {
      vivo = false;
    };
  }, [aberto]);

  const buscarSlots = useCallback(async () => {
    if (!data) return;
    setCarregando(true);
    setSlot(null);
    setSlots(null);
    const { getAvailableSlots } = await import("@/lib/actions");
    const { slots } = await getAvailableSlots(data);
    setSlots(slots);
    setCarregando(false);
  }, [data]);

  useEffect(() => {
    if (aberto && data) buscarSlots();
  }, [aberto, data, buscarSlots]);

  if (!aberto) return null;

  const fechar = () => {
    setAberto(false);
    setEtapa("form");
    setErro("");
    setResumo(null);
  };

  async function confirmar() {
    if (!serviceId || !slot) return;
    setCarregando(true);
    setErro("");
    const { createAppointment } = await import("@/lib/actions");
    const r = await createAppointment({
      nome,
      telefone,
      email,
      serviceId,
      data,
      horario: slot,
    });
    setCarregando(false);
    if (!r.ok) {
      setErro(r.erro ?? "Erro ao agendar.");
      buscarSlots();
      return;
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

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div className="modal-container">
        <button className="modal-close" onClick={fechar} aria-label="Fechar">
          &times;
        </button>
        <div className="p-8 md:p-10">
          {etapa === "sucesso" && resumo ? (
            <div className="text-center py-4">
              <div className="mb-4 flex justify-center text-(--rose-gold)">
                <IconSparkle size={44} />
              </div>
              <h3 className="font-heading text-3xl text-(--rose-gold) mb-2">Agendado com sucesso!</h3>
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
              <h3 className="font-heading text-3xl mt-1 mb-6">Escolha seu momento</h3>

              <div className="form-group">
                <label>Serviço *</label>
                <select
                  className="input-lux"
                  value={serviceId ?? ""}
                  onChange={(e) => setServiceId(Number(e.target.value))}
                >
                  {services.length === 0 && <option>Carregando...</option>}
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} — {s.aplicacao}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Nome *</label>
                  <input
                    className="input-lux"
                    placeholder="Seu nome"
                    maxLength={80}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>WhatsApp *</label>
                  <input
                    className="input-lux"
                    placeholder="(11) 99999-9999"
                    maxLength={20}
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>E-mail (opcional)</label>
                <input
                  className="input-lux"
                  type="email"
                  placeholder="seu@email.com"
                  maxLength={100}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Data *</label>
                <input
                  className="input-lux"
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Horários disponíveis *</label>
                {!slots || carregando ? (
                  <p className="text-(--rose-gold-light) text-sm py-3 text-center w-full">
                    Lendo a agenda...
                  </p>
                ) : slots.length === 0 ? (
                  <p className="text-(--text-muted) text-sm py-3 text-center w-full">
                    Nenhum horário livre nesta data. Escolha outro dia{" "}
                    <IconHeart size={13} className="inline-block -mt-[2px] text-(--rose-gold)" />
                  </p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {slots.map((h) => (
                      <button
                        key={h}
                        type="button"
                        className={`slot-btn disp ${slot === h ? "sel" : ""}`}
                        onClick={() => setSlot(h)}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {erro && <p className="text-[#ef5350] text-sm mb-4 text-center">{erro}</p>}

              <button
                className="btn btn-primary btn-block"
                disabled={!slot || !nome.trim() || !telefone.trim() || carregando}
                onClick={confirmar}
              >
                {carregando ? "Agendando..." : slot ? `Confirmar para às ${slot}` : "Escolha um horário"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

