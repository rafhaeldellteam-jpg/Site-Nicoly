"use client";

import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { syncAuthCookie } from "@/lib/auth-cookie";
import CampoSenha from "@/components/CampoSenha";
import { GoogleG } from "@/components/LoginModal";

type Modo = "entrar" | "esqueci" | "nova";

/** Brilhos fixos (posição em %, tamanho, atraso) — sem aleatório para não piscar entre renderizações. */
const BRILHOS = [
  [12, 18, 3, 0], [78, 12, 2, 1.2], [64, 36, 4, 2.1], [22, 62, 2, 0.6], [88, 70, 3, 1.8],
  [42, 84, 2, 2.6], [8, 88, 3, 1.1], [52, 8, 2, 3.2], [33, 40, 2, 1.5], [70, 90, 2, 0.3],
] as const;

export default function LoginPainel({
  negado,
  recuperando,
  aoEntrar,
  aoSenhaNova,
}: {
  negado: boolean;
  recuperando: boolean;
  /** login aceito (a página confere se a conta é administradora) */
  aoEntrar: () => void;
  aoSenhaNova: () => void;
}) {
  const [modo, setModo] = useState<Modo>(recuperando ? "nova" : "entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  function erro(texto: string) {
    setMsg({ tipo: "erro", texto });
    caixa.current?.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(7px)" }, { transform: "translateX(-4px)" }, { transform: "translateX(0)" }],
      { duration: 380, easing: "ease-out" }
    );
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setEnviando(true);
    try {
      if (modo === "entrar") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
        syncAuthCookie(data.session);
        if (error || !data.session) return erro(/rate limit|security/i.test(error?.message ?? "") ? "Muitas tentativas. Aguarde alguns minutos." : "E-mail ou senha incorretos.");
        aoEntrar();
      } else if (modo === "esqueci") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/admin` });
        if (error) return erro("Não foi possível enviar agora. Tente de novo em alguns minutos.");
        setMsg({ tipo: "ok", texto: "Enviamos um link para o seu e-mail. Abra-o neste aparelho para criar a nova senha." });
      } else {
        const { error } = await supabase.auth.updateUser({ password: senha });
        if (error)
          return erro(/different|same/i.test(error.message) ? "A nova senha precisa ser diferente da antiga." : "O link expirou. Peça um novo em “Esqueci minha senha”.");
        aoSenhaNova();
      }
    } catch {
      erro("Sem conexão no momento. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  async function google() {
    setEnviando(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/admin` },
    });
    if (error) erro("Login com Google ainda não está ativo neste projeto.");
    setEnviando(false);
  }

  async function sair() {
    await supabase.auth.signOut();
    syncAuthCookie(null);
    location.reload();
  }

  const titulo = negado ? "Acesso não liberado" : modo === "esqueci" ? "Recuperar acesso" : modo === "nova" ? "Nova senha" : "Bem-vinda de volta";

  return (
    <main className="adm-login">
      {/* lado da marca (no celular vira faixa no topo) */}
      <section className="adm-login-marca" aria-hidden="true">
        <div className="adm-login-foto" />
        {BRILHOS.map(([x, y, t, d], i) => (
          <i key={i} className="adm-login-brilho" style={{ left: `${x}%`, top: `${y}%`, width: t * 2, height: t * 2, animationDelay: `${d}s` } as CSSProperties} />
        ))}
        <div className="adm-login-marca-conteudo">
          <div className="login-logo grande">
            <span className="login-logo-anel" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" width={96} height={96} />
          </div>
          <p className="adm-login-nome font-heading">Nicbeautty</p>
          <p className="adm-login-frase">Agenda, clientes VIP e faturamento — tudo na palma da mão.</p>
        </div>
      </section>

      <section className="adm-login-form">
        <div ref={caixa} className="adm-login-caixa">
          <p className="adm-login-selo">Painel administrativo</p>
          <h1 className="font-heading text-4xl mb-2">
            <span className="ouro-texto">{titulo}</span>
          </h1>

          {negado ? (
            <>
              <p className="text-(--text-muted) text-sm mb-7">
                Esta conta entrou, mas não está na lista de administradoras. Peça para liberarem seu e-mail na tabela “administradores” do Supabase.
              </p>
              <button onClick={sair} className="btn btn-primary btn-block">
                Entrar com outra conta
              </button>
            </>
          ) : (
            <div key={modo} className="login-conteudo">
              <p className="text-(--text-muted) text-sm mb-7">
                {modo === "entrar"
                  ? "Entre para ver a agenda do dia, os planos VIP e quanto já entrou no mês."
                  : modo === "esqueci"
                    ? "Digite o e-mail da sua conta de administradora e enviamos um link para criar outra senha."
                    : "Escolha a nova senha do painel."}
              </p>

              {modo === "entrar" && (
                <>
                  <button type="button" onClick={google} disabled={enviando} className="btn btn-outline btn-block mb-5 inline-flex items-center justify-center gap-3">
                    <GoogleG /> Entrar com o Google
                  </button>
                  <div className="flex items-center gap-3 mb-5 text-(--text-muted) text-xs uppercase tracking-widest">
                    <span className="flex-1 h-px bg-(--border-color)" />
                    ou
                    <span className="flex-1 h-px bg-(--border-color)" />
                  </div>
                </>
              )}

              <form onSubmit={enviar}>
                {modo !== "nova" && (
                  <div className="form-group">
                    <label htmlFor="adm-email">E-mail *</label>
                    <input
                      id="adm-email"
                      type="email"
                      className="input-lux"
                      required
                      autoComplete="username"
                      placeholder="voce@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                )}
                {modo !== "esqueci" && (
                  <CampoSenha
                    id="adm-senha"
                    rotulo={modo === "nova" ? "Nova senha" : "Senha"}
                    valor={senha}
                    aoMudar={setSenha}
                    novaSenha={modo === "nova"}
                    mostrarForca={modo === "nova"}
                    placeholder={modo === "nova" ? "Mínimo 6 caracteres" : "Sua senha"}
                  />
                )}
                {modo === "entrar" && (
                  <button type="button" className="login-link -mt-2 mb-4 block ml-auto" onClick={() => { setModo("esqueci"); setMsg(null); }}>
                    Esqueci minha senha
                  </button>
                )}
                {msg && (
                  <p className={`login-msg ${msg.tipo}`} role={msg.tipo === "erro" ? "alert" : "status"}>
                    {msg.texto}
                  </p>
                )}
                <button className="btn btn-primary btn-block login-enviar" disabled={enviando}>
                  {enviando && <span className="login-giro" aria-hidden="true" />}
                  {enviando ? "Aguarde..." : modo === "entrar" ? "Entrar no painel" : modo === "esqueci" ? "Enviar link" : "Salvar e entrar"}
                </button>
              </form>
              {modo === "esqueci" && (
                <button type="button" className="login-link mx-auto mt-6 block" onClick={() => { setModo("entrar"); setMsg(null); }}>
                  ← Voltar para o login
                </button>
              )}
            </div>
          )}

          <p className="adm-login-seguro">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Acesso restrito às administradoras autorizadas
          </p>
          <Link href="/" className="block text-center text-sm text-(--text-muted) hover:text-(--rose-gold) mt-4">
            ← Voltar ao site
          </Link>
        </div>
      </section>
    </main>
  );
}
