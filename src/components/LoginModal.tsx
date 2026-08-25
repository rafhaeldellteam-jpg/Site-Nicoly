"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Modo = "entrar" | "criar";

export default function LoginModal() {
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<Modo>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const fn = () => {
      setAberto(true);
      setMsg(null);
    };
    window.addEventListener("abrir-login", fn);
    return () => window.removeEventListener("abrir-login", fn);
  }, []);

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault();
    setMsg(null);
    setEnviando(true);
    try {
      if (modo === "criar") {
        if (nome.trim().length < 2) {
          setMsg({ tipo: "erro", texto: "Informe seu nome." });
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: { data: { nome: nome.trim() }, emailRedirectTo: window.location.origin },
        });
        if (error) {
          setMsg({ tipo: "erro", texto: traduzErro(error.message) });
          return;
        }
        if (data.session) {
          setMsg({ tipo: "ok", texto: "Conta criada! Bem-vinda." });
          setTimeout(() => setAberto(false), 1200);
        } else {
          setMsg({
            tipo: "ok",
            texto: "Conta criada! Confirme o e-mail que enviamos para ativar o login.",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        });
        if (error) {
          setMsg({ tipo: "erro", texto: traduzErro(error.message) });
          return;
        }
        setMsg({ tipo: "ok", texto: "Bem-vinda de volta!" });
        setTimeout(() => setAberto(false), 800);
      }
    } finally {
      setEnviando(false);
    }
  }

  async function entrarGoogle() {
    setMsg(null);
    setEnviando(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setMsg({ tipo: "erro", texto: traduzErro(error.message) });
    setEnviando(false);
  }

  function fechar() {
    setAberto(false);
    setSenha("");
    setMsg(null);
  }

  if (!aberto) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div className="modal-container">
        <button className="modal-close" onClick={fechar} aria-label="Fechar">
          &times;
        </button>
        <div className="p-8 md:p-10">
          <h3 className="font-heading text-3xl text-(--rose-gold) text-center mb-1">
            {modo === "entrar" ? "Bem-vinda" : "Criar conta"}
          </h3>
          <p className="text-(--text-muted) text-sm text-center mb-7">
            Faça login para salvar seus dados e agilizar seus agendamentos.
          </p>

          <button type="button" onClick={entrarGoogle} disabled={enviando} className="btn btn-outline btn-block mb-5 inline-flex items-center justify-center gap-3">
            <GoogleG /> Continuar com o Google
          </button>

          <div className="flex items-center gap-3 mb-5 text-(--text-muted) text-xs uppercase tracking-widest">
            <span className="flex-1 h-px bg-(--border-color)" />
            ou com e-mail
            <span className="flex-1 h-px bg-(--border-color)" />
          </div>

          <form onSubmit={enviar}>
            {modo === "criar" && (
              <div className="form-group">
                <label>Seu nome *</label>
                <input
                  className="input-lux"
                  placeholder="Seu nome completo"
                  maxLength={80}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
            )}
            <div className="form-group">
              <label>E-mail *</label>
              <input
                className="input-lux"
                type="email"
                required
                placeholder="seu@email.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Senha *</label>
              <input
                className="input-lux"
                type="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>

            {msg && (
              <p className={`text-sm mb-4 text-center ${msg.tipo === "ok" ? "text-green-400" : "text-[#ef5350]"}`}>
                {msg.texto}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
              {enviando ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar minha conta"}
            </button>
          </form>

          <p className="text-center text-sm text-(--text-muted) mt-6">
            {modo === "entrar" ? (
              <>
                Não tem conta?{" "}
                <button type="button" onClick={() => { setModo("criar"); setMsg(null); }} className="text-(--rose-gold) hover:text-(--rose-gold-light)">
                  Criar agora
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button type="button" onClick={() => { setModo("entrar"); setMsg(null); }} className="text-(--rose-gold) hover:text-(--rose-gold-light)">
                  Entrar
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function traduzErro(msg: string): string {
  if (/invalid login/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/already registered/i.test(msg)) return "Este e-mail já tem conta. Faça login.";
  if (/rate limit/i.test(msg)) return "Muitas tentativas. Aguarde alguns minutos.";
  if (/password.*weak|at least 6/i.test(msg)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/valid email/i.test(msg)) return "E-mail inválido.";
  if (/provider is not enabled|unsupported_provider/i.test(msg))
    return "Login com Google ainda não está ativo neste projeto.";
  return msg;
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8a12 12 0 110-24c3.058 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.058 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}
