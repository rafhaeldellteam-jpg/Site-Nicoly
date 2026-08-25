"use client";

let campanhaCache: string | null | undefined;

/** Guarda a campanha de origem (ex.: ?utm=instagram) na primeira visita. */
export function capturarCampanha(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = params.get("utm") ?? params.get("utm_source");
    if (utm && !sessionStorage.getItem("nic_utm")) {
      sessionStorage.setItem("nic_utm", utm.slice(0, 40));
    }
  } catch {
    /* storage bloqueado — ignora */
  }
}

function campanhaAtual(): string | null {
  if (campanhaCache !== undefined) return campanhaCache;
  try {
    campanhaCache = sessionStorage.getItem("nic_utm");
  } catch {
    campanhaCache = null;
  }
  return campanhaCache;
}

/** Registra um clique no WhatsApp (fire-and-forget, nunca bloqueia a navegação). */
export function rastrearCliqueWhatsapp(origem: string): void {
  try {
    void fetch("/api/rastrear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origem, utm: campanhaAtual() }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignora */
  }
}
