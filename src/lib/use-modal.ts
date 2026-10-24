"use client";

import { useEffect, useRef } from "react";

/**
 * Comportamento padrão dos modais:
 * - fecha com a tecla Esc
 * - trava a rolagem da página de fundo enquanto está aberto
 * - devolve o foco para onde estava ao fechar
 */
export function useModal(aberto: boolean, onClose: () => void): void {
  const fecharRef = useRef(onClose);
  useEffect(() => {
    fecharRef.current = onClose;
  });

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fecharRef.current();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      anterior?.focus?.();
    };
  }, [aberto]);
}
