"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const CHAVE_DISPENSOU = "nic_pwa_dispensou";
const DIAS_SEM_PERGUNTAR = 14;

function podePerguntar(): boolean {
  try {
    const t = Number(localStorage.getItem(CHAVE_DISPENSOU) ?? 0);
    return Date.now() - t > DIAS_SEM_PERGUNTAR * 86400000;
  } catch {
    return false;
  }
}

function lembrarDispensa(): void {
  try {
    localStorage.setItem(CHAVE_DISPENSOU, String(Date.now()));
  } catch {
    /* ignora */
  }
}

/**
 * Registra o service worker e mostra dois avisos discretos:
 * - "Instalar o app" (Android/desktop: botão; iPhone: instrução do Safari)
 * - "Nova versão disponível" quando o site foi atualizado
 */
export default function PWARegister() {
  const [instalar, setInstalar] = useState<BeforeInstallPromptEvent | null>(null);
  const [dicaIOS, setDicaIOS] = useState(false);
  const [espera, setEspera] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let recarregou = false;
    const aoTrocar = () => {
      if (recarregou) return;
      recarregou = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", aoTrocar);

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) setEspera(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const novo = reg.installing;
          novo?.addEventListener("statechange", () => {
            if (novo.state === "installed" && navigator.serviceWorker.controller) setEspera(novo);
          });
        });
        // procura atualização quando a cliente volta para o app
        const checar = () => document.visibilityState === "visible" && reg.update().catch(() => {});
        document.addEventListener("visibilitychange", checar);
      })
      .catch(() => {});

    return () => navigator.serviceWorker.removeEventListener("controllerchange", aoTrocar);
  }, []);

  useEffect(() => {
    const instalado =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (instalado || !podePerguntar()) return;

    const aoOferecer = (e: Event) => {
      e.preventDefault();
      const evento = e as BeforeInstallPromptEvent;
      // espera a cliente navegar um pouco antes de oferecer
      setTimeout(() => setInstalar(evento), 25000);
    };
    window.addEventListener("beforeinstallprompt", aoOferecer);

    const ua = navigator.userAgent;
    const ehIOS = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    const timer = ehIOS ? setTimeout(() => setDicaIOS(true), 30000) : undefined;

    const aoInstalar = () => {
      setInstalar(null);
      lembrarDispensa();
    };
    window.addEventListener("appinstalled", aoInstalar);

    return () => {
      window.removeEventListener("beforeinstallprompt", aoOferecer);
      window.removeEventListener("appinstalled", aoInstalar);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (espera) {
    return (
      <div className="pwa-banner" role="status">
        <p className="flex-1">
          <strong>Nova versão disponível</strong>
          Atualize para ver as novidades do site.
        </p>
        <button className="btn btn-primary py-2.5! px-4! text-sm!" onClick={() => espera.postMessage("ATUALIZAR")}>
          Atualizar
        </button>
      </div>
    );
  }

  if (instalar || dicaIOS) {
    const fechar = () => {
      lembrarDispensa();
      setInstalar(null);
      setDicaIOS(false);
    };
    return (
      <div className="pwa-banner" role="dialog" aria-label="Instalar o app Nicbeautty">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-xl shrink-0" />
        <p className="flex-1">
          <strong>Instale o app Nicbeautty</strong>
          {instalar
            ? "Agende em segundos direto da tela inicial."
            : "No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”."}
        </p>
        {instalar && (
          <button
            className="btn btn-primary py-2.5! px-4! text-sm!"
            onClick={async () => {
              await instalar.prompt();
              await instalar.userChoice.catch(() => null);
              fechar();
            }}
          >
            Instalar
          </button>
        )}
        <button onClick={fechar} aria-label="Agora não" className="text-(--text-muted) text-2xl leading-none px-1">
          &times;
        </button>
      </div>
    );
  }

  return null;
}
