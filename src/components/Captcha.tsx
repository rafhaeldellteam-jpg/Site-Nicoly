"use client";

import { useEffect, useRef } from "react";

/*
 * Captcha da Cloudflare (Turnstile) no modo "gerenciado": para a maioria
 * das pessoas ele confirma sozinho, sem precisar clicar em nada.
 * Sem NEXT_PUBLIC_TURNSTILE_SITE_KEY configurada, não aparece.
 */

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let carregando: Promise<void> | null = null;
function carregarScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!carregando) {
    carregando = new Promise((ok, erro) => {
      const s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      s.onload = () => ok();
      s.onerror = () => {
        carregando = null;
        erro(new Error("turnstile"));
      };
      document.head.appendChild(s);
    });
  }
  return carregando;
}

export const captchaAtivo = !!SITE_KEY;

/**
 * Mostra o captcha e entrega o token em `aoValidar`.
 * Troque `reiniciar` (ex.: um contador) para pedir um token novo depois de um erro.
 */
export default function Captcha({
  aoValidar,
  reiniciar = 0,
}: {
  aoValidar: (token: string) => void;
  reiniciar?: number;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const idWidget = useRef<string | null>(null);
  const callback = useRef(aoValidar);
  useEffect(() => {
    callback.current = aoValidar;
  });

  useEffect(() => {
    if (!SITE_KEY) return;
    let vivo = true;
    carregarScript()
      .then(() => {
        if (!vivo || !caixa.current || !window.turnstile) return;
        if (idWidget.current) window.turnstile.remove(idWidget.current);
        idWidget.current = window.turnstile.render(caixa.current, {
          sitekey: SITE_KEY,
          theme: "dark",
          language: "pt-br",
          size: "flexible",
          callback: (t: string) => callback.current(t),
          "expired-callback": () => callback.current(""),
          "error-callback": () => callback.current(""),
        });
      })
      .catch(() => callback.current(""));
    return () => {
      vivo = false;
      if (idWidget.current && window.turnstile) window.turnstile.remove(idWidget.current);
      idWidget.current = null;
    };
  }, [reiniciar]);

  if (!SITE_KEY) return null;
  return <div ref={caixa} className="captcha-caixa" />;
}
