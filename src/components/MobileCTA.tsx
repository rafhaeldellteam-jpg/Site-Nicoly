"use client";

import { useEffect, useState } from "react";
import LinkWhatsapp from "@/components/LinkWhatsapp";
import { WhatsAppIcon } from "@/components/icons";

/**
 * Barra fixa no rodapé do celular com "Agendar" e WhatsApp.
 * Aparece depois que a cliente rola além do topo da página.
 */
export default function MobileCTA() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const fn = () => {
      const fim = window.innerHeight + window.scrollY >= document.body.scrollHeight - 160;
      setVisivel(window.scrollY > window.innerHeight * 0.7 && !fim);
    };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div className={`mobile-cta lg:hidden ${visivel ? "on" : ""}`} aria-hidden={!visivel}>
      <button
        type="button"
        tabIndex={visivel ? 0 : -1}
        className="btn btn-primary flex-1 min-h-[48px]!"
        onClick={() => window.dispatchEvent(new CustomEvent("abrir-agendamento"))}
      >
        Agendar horário
      </button>
      <LinkWhatsapp
        origem="barra_mobile"
        className="btn btn-outline w-[52px] min-h-[48px]! px-0! shrink-0"
      >
        <WhatsAppIcon size={22} />
        <span className="sr-only">Falar no WhatsApp</span>
      </LinkWhatsapp>
    </div>
  );
}
