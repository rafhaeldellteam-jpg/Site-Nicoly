"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function IndicarPage() {
  const [tab, setTab] = useState<"criar" | "usar">("criar");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [code, setCode] = useState("");
  const [referredName, setReferredName] = useState("");
  const [referredWhatsapp, setReferredWhatsapp] = useState("");
  const [msg, setMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !whatsapp.trim()) return;
    setLoading(true);
    setMsg("");
    try {
      const { createReferral } = await import("@/lib/marketing-actions");
      const result = await createReferral(name.trim(), whatsapp.trim());
      setMsg(result.msg);
      setSuccess(result.ok);
      if (result.ok && result.code) {
        setGeneratedCode(result.code);
        setName("");
        setWhatsapp("");
      }
    } catch {
      setMsg("Erro ao gerar codigo.");
    }
    setLoading(false);
  }

  async function handleUse(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !referredName.trim() || !referredWhatsapp.trim()) return;
    setLoading(true);
    setMsg("");
    try {
      const { useReferral } = await import("@/lib/marketing-actions");
      const result = await useReferral(code.trim(), referredName.trim(), referredWhatsapp.trim());
      setMsg(result.msg);
      setSuccess(result.ok);
      if (result.ok) { setCode(""); setReferredName(""); setReferredWhatsapp(""); }
    } catch {
      setMsg("Erro ao usar codigo.");
    }
    setLoading(false);
  }

  const shareText = generatedCode
    ? encodeURIComponent(`Oi! Estou te indicando a Nicbeautty Lash Designer! Use meu codigo ${generatedCode} e ganhe desconto no primeiro atendimento! Acesse: https://nicbeautty.vercel.app/indicar?code=${generatedCode}`)
    : "";

  return (
    <>
      <Navbar />
      <main className="pt-[calc(env(safe-area-inset-top)+76px)]">
        <section className="section">
          <div className="container-x max-w-2xl">
            <div className="text-center mb-14">
              <span className="section-subtitle">Indique e Ganhe</span>
              <h1 className="section-title">Programa de Indicacao</h1>
              <p className="text-(--text-muted) max-w-lg mx-auto">
                Indique a Nicbeautty para suas amigas e ambas ganham desconto!
              </p>
            </div>

            <div className="lux-card p-8 md:p-10">
              <div className="flex gap-2 mb-8">
                <button onClick={() => { setTab("criar"); setMsg(""); setGeneratedCode(""); }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: tab === "criar" ? "var(--rose-gold)" : "var(--bg-primary)",
                    color: tab === "criar" ? "#14100c" : "var(--text-muted)",
                    border: `1px solid ${tab === "criar" ? "var(--rose-gold)" : "var(--border-color)"}`,
                  }}>
                  Quero Indicar
                </button>
                <button onClick={() => { setTab("usar"); setMsg(""); setGeneratedCode(""); }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: tab === "usar" ? "var(--rose-gold)" : "var(--bg-primary)",
                    color: tab === "usar" ? "#14100c" : "var(--text-muted)",
                    border: `1px solid ${tab === "usar" ? "var(--rose-gold)" : "var(--border-color)"}`,
                  }}>
                  Tenho um Codigo
                </button>
              </div>

              {tab === "criar" ? (
                <form onSubmit={handleCreate} className="space-y-4">
                  <p className="text-sm text-(--text-muted) mb-4">
                    Preencha seus dados para gerar seu codigo unico de indicacao.
                  </p>
                  <div className="form-group">
                    <label>Seu nome</label>
                    <input type="text" placeholder="Nome completo" value={name} onChange={e => setName(e.target.value)}
                      className="input-lux" required />
                  </div>
                  <div className="form-group">
                    <label>Seu WhatsApp</label>
                    <input type="tel" placeholder="11 99999-9999" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                      className="input-lux" required />
                  </div>
                  <button type="submit" disabled={loading} className="btn btn-primary w-full py-3!">
                    {loading ? "Gerando..." : "Gerar Meu Codigo"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleUse} className="space-y-4">
                  <p className="text-sm text-(--text-muted) mb-4">
                    Recebeu um codigo de uma amiga? Use aqui e ganhe desconto!
                  </p>
                  <div className="form-group">
                    <label>Codigo de indicacao</label>
                    <input type="text" placeholder="Ex: ABC123" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                      className="input-lux text-center text-lg tracking-widest font-bold" required maxLength={6} />
                  </div>
                  <div className="form-group">
                    <label>Seu nome</label>
                    <input type="text" placeholder="Nome completo" value={referredName} onChange={e => setReferredName(e.target.value)}
                      className="input-lux" required />
                  </div>
                  <div className="form-group">
                    <label>Seu WhatsApp</label>
                    <input type="tel" placeholder="11 99999-9999" value={referredWhatsapp} onChange={e => setReferredWhatsapp(e.target.value)}
                      className="input-lux" required />
                  </div>
                  <button type="submit" disabled={loading} className="btn btn-primary w-full py-3!">
                    {loading ? "Validando..." : "Usar Codigo"}
                  </button>
                </form>
              )}

              {generatedCode && (
                <div className="mt-6 p-5 rounded-2xl text-center" style={{ background: "var(--bg-primary)", border: "2px dashed var(--rose-gold)" }}>
                  <p className="text-xs uppercase tracking-wider text-(--text-muted) mb-2">Seu codigo de indicacao</p>
                  <p className="text-3xl font-bold tracking-[0.3em] mb-3" style={{ color: "var(--rose-gold)" }}>{generatedCode}</p>
                  <p className="text-xs text-(--text-muted) mb-4">
                    Compartilhe com suas amigas! Cada amiga que usar seu codigo ganha desconto, e voce tambem!
                  </p>
                  <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener noreferrer"
                    className="btn btn-primary py-2! px-6! text-sm!">
                    Compartilhar no WhatsApp
                  </a>
                </div>
              )}

              {msg && (
                <p className={`text-sm text-center mt-4 ${success ? "text-green-400" : "text-red-400"}`}>{msg}</p>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}