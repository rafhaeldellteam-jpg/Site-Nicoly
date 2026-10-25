"use client";

import { useState } from "react";
import { IconCheck } from "@/components/icons";
import { createAssinaturaPublic } from "@/lib/acoes/planos";

/** Formulário do pedido de Plano VIP (etapa 2 da página de planos). */
export default function PlanosSignup({ tecnicas = [] }: { tecnicas?: string[] }) {
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ nome: "", whatsapp: "", email: "", tecnica: "" });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    let res: { ok: boolean; erro?: string };
    try {
      res = await createAssinaturaPublic(form);
    } catch {
      res = { ok: false, erro: "Sem conexão no momento. Tente novamente." };
    }
    setEnviando(false);
    if (res.ok) {
      setOk(true);
    } else {
      setErro(res.erro ?? "Erro inesperado. Tente novamente.");
    }
  }

  if (ok) {
    return (
      <div className="lux-card p-8 text-center mt-6">
        <span
          className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4"
          style={{ background: "rgba(216,163,125,0.15)" }}
          aria-hidden="true"
        >
          <IconCheck size={26} />
        </span>
        <h3 className="font-heading text-2xl mb-2">Pedido recebido!</h3>
        <p className="text-(--text-muted)">
          A Nicoly vai falar com você pelo WhatsApp para combinar o pagamento. Assim que for
          confirmado, seu Plano VIP é ativado e você recebe a confirmação por e-mail.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="lux-card p-6! md:p-7! mt-6 space-y-5 text-left" aria-label="Pedir Plano VIP pelo site">
      <h3 className="font-heading text-xl">Seus dados para o Plano VIP</h3>

      <div>
        <label htmlFor="plano-nome" className="block text-xs font-semibold uppercase tracking-wider text-(--text-muted) mb-2">
          Nome completo
        </label>
        <input
          id="plano-nome"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          required
          minLength={3}
          maxLength={80}
          autoComplete="name"
          className="input-lux w-full"
          placeholder="Seu nome"
        />
      </div>

      <div>
        <label htmlFor="plano-zap" className="block text-xs font-semibold uppercase tracking-wider text-(--text-muted) mb-2">
          WhatsApp
        </label>
        <input
          id="plano-zap"
          value={form.whatsapp}
          onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          required
          inputMode="tel"
          autoComplete="tel"
          className="input-lux w-full"
          placeholder="(11) 99999-9999"
        />
      </div>

      <div>
        <label htmlFor="plano-email" className="block text-xs font-semibold uppercase tracking-wider text-(--text-muted) mb-2">
          E-mail <span className="normal-case font-normal">— para receber a confirmação</span>
        </label>
        <input
          id="plano-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          autoComplete="email"
          className="input-lux w-full"
          placeholder="seu@email.com"
        />
      </div>

      <div>
        <label htmlFor="plano-tecnica" className="block text-xs font-semibold uppercase tracking-wider text-(--text-muted) mb-2">
          Técnica preferida
        </label>
        <select
          id="plano-tecnica"
          value={form.tecnica}
          onChange={(e) => setForm({ ...form, tecnica: e.target.value })}
          className="input-lux w-full"
        >
          <option value="">Escolher depois</option>
          {(tecnicas.length
            ? tecnicas
            : ["Fio a Fio", "Volume Brasileiro", "Volume Fox Eyes", "Volume de Luxo"]
          ).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {erro && (
        <p role="alert" className="text-sm text-red-400">
          {erro}
        </p>
      )}

      <button type="submit" disabled={enviando} className="btn btn-primary btn-block py-[16px]!">
        {enviando ? "Enviando..." : "Pedir meu Plano VIP — R$ 180/mês"}
      </button>
    </form>
  );
}
