"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { useModal } from "@/lib/use-modal";
import CampoSenha from "@/components/CampoSenha";

type Modo = "entrar" | "criar" | "esqueci" | "nova";

const TITULOS: Record<Modo, { titulo: string; sub: string }> = {
  entrar: { titulo: "Bem-vinda de volta", sub: "Entre para agendar mais rápido e acompanhar seus horários." },
  criar: { titulo: "Crie sua conta", sub: "Leva menos de 1 minuto — e seus dados ficam salvos para os próximos agendamentos." },
  esqueci: { titulo: "Esqueceu a senha?", sub: "Digite seu e-mail e enviamos um link para você criar uma nova." },
  nova: { titulo: "Crie uma nova senha", sub: "Escolha uma senha que você não use em outros sites." },
};

const VANTAGENS = ["Agende em segundos", "Remarque ou cancele pelo site", "Acompanhe seu Plano VIP"];

export default function LoginModal() {
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<Modo>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const abrir = () => {
      setAberto(true);
      setSucesso(false);
      setMsg(null);
    };
    window.addEventListener("abrir-login", abrir);
    // a cliente clicou no link "redefinir senha" do e-mail
    const { data: sub } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "PASSWORD_RECOVERY") {
        setModo("nova");
        setSenha("");
        abrir();
      }
    });
    return () => {
      window.removeEventListener("abrir-login", abrir);
      sub.subscription.unsubscribe();
    };
  }, []);

  function trocar(m: Modo) {
    setModo(m);
    setMsg(null);
  }

  function erro(texto: string) {
    setMsg({ tipo: "erro", texto });
    // a caixa "treme" de leve para chamar atenção ao erro
    caixa.current?.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(7px)" }, { transform: "translateX(-4px)" }, { transform: "translateX(0)" }],
      { duration: 380, easing: "ease-out" }
    );
  }

  function concluir(texto: string, fecharEm = 1300) {
    setMsg({ tipo: "ok", texto });
    setSucesso(true);
    setTimeout(() => {
      setAberto(false);
      setSucesso(false);
      setSenha("");
      setMsg(null);
      setModo("entrar");
    }, fecharEm);
  }

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault();
    setMsg(null);
    setEnviando(true);
    try {
      if (modo === "criar") {
        if (nome.trim().length < 2) return erro("Informe seu nome.");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: { data: { nome: nome.trim() }, emailRedirectTo: window.location.origin },
        });
        if (error) return erro(traduzErro(error.message));
        if (data.session) concluir(`Conta criada! Bem-vinda, ${nome.trim().split(" ")[0]} ✨`);
        else setMsg({ tipo: "ok", texto: "Conta criada! Confirme o e-mail que enviamos para ativar o login." });
      } else if (modo === "entrar") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
        if (error) return erro(traduzErro(error.message));
        const n = data.user?.user_metadata?.nome ?? data.user?.user_metadata?.full_name;
        concluir(typeof n === "string" && n ? `Que bom te ver, ${n.split(" ")[0]}!` : "Bem-vinda de volta!", 1000);
      } else if (modo === "esqueci") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
        if (error) return erro(traduzErro(error.message));
        setMsg({ tipo: "ok", texto: "Pronto! Se este e-mail tiver conta, o link chega em instantes (veja também o spam)." });
      } else {
        const { error } = await supabase.auth.updateUser({ password: senha });
        if (error) return erro(traduzErro(error.message));
        concluir("Senha alterada! Você já está conectada.");
      }
    } catch {
      erro("Sem conexão no momento. Tente de novo.");
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
    if (error) erro(traduzErro(error.message));
    setEnviando(false);
  }

  function fechar() {
    setAberto(false);
    setSenha("");
    setMsg(null);
    setSucesso(false);
    if (modo === "esqueci") setModo("entrar");
  }

  useModal(aberto, fechar);

  if (!aberto) return null;

  const t = TITULOS[modo];
  const comAbas = modo === "entrar" || modo === "criar";
  const textoBotao = enviando
    ? "Aguarde..."
    : { entrar: "Entrar", criar: "Criar minha conta", esqueci: "Enviar link", nova: "Salvar nova senha" }[modo];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div
        ref={caixa}
        className="modal-container login-caixa"
        role="dialog"
        aria-modal="true"
        aria-label={t.titulo}
      >
        <button className="modal-close" onClick={fechar} aria-label="Fechar">
          &times;
        </button>
        <div className="login-topo" aria-hidden="true">
          <div className="login-logo">
            <span className="login-logo-anel" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" width={64} height={64} />
          </div>
        </div>

        <div className="px-7 pb-8 md:px-10 md:pb-10">
          {sucesso ? (
            <div className="login-sucesso" role="status">
              <div className="login-sucesso-check">✓</div>
              <p className="font-heading text-2xl">{msg?.texto}</p>
            </div>
          ) : (
            <>
              {comAbas && (
                <div className="login-abas" role="tablist" style={{ "--x": modo === "criar" ? "100%" : "0%" } as CSSProperties}>
                  <span className="login-abas-pilula" aria-hidden="true" />
                  <button type="button" role="tab" aria-selected={modo === "entrar"} onClick={() => trocar("entrar")}>
                    Entrar
                  </button>
                  <button type="button" role="tab" aria-selected={modo === "criar"} onClick={() => trocar("criar")}>
                    Criar conta
                  </button>
                </div>
              )}

              <div key={modo} className="login-conteudo">
                <h3 className="font-heading text-3xl text-center mb-1">
                  <span className="ouro-texto">{t.titulo}</span>
                </h3>
                <p className="text-(--text-muted) text-sm text-center mb-6">{t.sub}</p>

                {modo === "criar" && (
                  <ul className="login-vantagens">
                    {VANTAGENS.map((v, i) => (
                      <li key={v} style={{ "--d": `${120 + i * 90}ms` } as CSSProperties}>
                        {v}
                      </li>
                    ))}
                  </ul>
                )}

                {comAbas && (
                  <>
                    <button
                      type="button"
                      onClick={entrarGoogle}
                      disabled={enviando}
                      className="btn btn-outline btn-block mb-5 inline-flex items-center justify-center gap-3"
                    >
                      <GoogleG /> Continuar com o Google
                    </button>
                    <div className="flex items-center gap-3 mb-5 text-(--text-muted) text-xs uppercase tracking-widest">
                      <span className="flex-1 h-px bg-(--border-color)" />
                      ou com e-mail
                      <span className="flex-1 h-px bg-(--border-color)" />
                    </div>
                  </>
                )}

                <form onSubmit={enviar} noValidate={false}>
                  {modo === "criar" && (
                    <div className="form-group">
                      <label htmlFor="login-nome">Seu nome *</label>
                      <input
                        id="login-nome"
                        className="input-lux"
                        placeholder="Seu nome completo"
                        maxLength={80}
                        autoComplete="name"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                      />
                    </div>
                  )}
                  {modo !== "nova" && (
                    <div className="form-group">
                      <label htmlFor="login-email">E-mail *</label>
                      <input
                        id="login-email"
                        className="input-lux"
                        type="email"
                        required
                        placeholder="seu@email.com"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  )}
                  {modo !== "esqueci" && (
                    <CampoSenha
                      id="login-senha"
                      rotulo={modo === "nova" ? "Nova senha" : "Senha"}
                      valor={senha}
                      aoMudar={setSenha}
                      novaSenha={modo !== "entrar"}
                      mostrarForca={modo !== "entrar"}
                    />
                  )}
                  {modo === "entrar" && (
                    <button type="button" className="login-link -mt-2 mb-4 block ml-auto" onClick={() => trocar("esqueci")}>
                      Esqueci minha senha
                    </button>
                  )}

                  {msg && (
                    <p className={`login-msg ${msg.tipo}`} role={msg.tipo === "erro" ? "alert" : "status"}>
                      {msg.texto}
                    </p>
                  )}

                  <button type="submit" className="btn btn-primary btn-block login-enviar" disabled={enviando}>
                    {enviando && <span className="login-giro" aria-hidden="true" />}
                    {textoBotao}
                  </button>
                </form>

                {modo === "esqueci" && (
                  <button type="button" className="login-link mx-auto mt-6 block" onClick={() => trocar("entrar")}>
                    ← Voltar para o login
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function traduzErro(msg: string): string {
  if (/invalid login/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (/already registered/i.test(msg)) return "Este e-mail já tem conta. Faça login.";
  if (/rate limit|security purposes/i.test(msg)) return "Muitas tentativas. Aguarde alguns minutos.";
  if (/password.*weak|at least 6/i.test(msg)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/same.*password|different from the old/i.test(msg)) return "A nova senha precisa ser diferente da antiga.";
  if (/valid email|invalid.*email/i.test(msg)) return "E-mail inválido.";
  if (/session.*missing|not authenticated/i.test(msg)) return "O link expirou. Peça um novo em “Esqueci minha senha”.";
  if (/provider is not enabled|unsupported_provider/i.test(msg)) return "Login com Google ainda não está ativo neste projeto.";
  return msg;
}

export function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8a12 12 0 110-24c3.058 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.058 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}
