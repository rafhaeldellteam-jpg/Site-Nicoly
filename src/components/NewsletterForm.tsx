"use client";

import { useState } from "react";

export default function NewsletterForm() {
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contato.trim()) return;
    setLoading(true);
    setMsg("");
    setSuccess(false);
    try {
      const { subscribeNewsletter } = await import("@/lib/marketing-actions");
      const result = await subscribeNewsletter(nome.trim(), contato.trim());
      setMsg(result.msg);
      setSuccess(result.ok);
      if (result.ok) { setNome(""); setContato(""); }
    } catch {
      setMsg("Erro ao inscrever. Tente novamente.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm font-semibold" style={{ color: "var(--rose-gold-light)" }}>
        Receba dicas e ofertas exclusivas
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="Seu nome"
          value={nome}
          onChange={e => setNome(e.target.value)}
          className="input-lux flex-1"
        />
        <input
          type="text"
          placeholder="WhatsApp ou E-mail"
          value={contato}
          onChange={e => setContato(e.target.value)}
          className="input-lux flex-1"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary w-full py-3! text-sm!"
      >
        {loading ? "Inscrevendo..." : "Quero Receber!"}
      </button>
      {msg && (
        <p className={`text-xs text-center ${success ? "text-green-400" : "text-red-400"}`}>
          {msg}
        </p>
      )}
    </form>
  );
}