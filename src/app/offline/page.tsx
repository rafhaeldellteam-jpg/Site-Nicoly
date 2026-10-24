import type { Metadata } from "next";
import Link from "next/link";
import { buildWhatsAppLink } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Sem conexão",
  robots: { index: false, follow: false },
};

/** Mostrada pelo app instalado quando a cliente está sem internet. */
export default function OfflinePage() {
  return (
    <main className="min-h-[100svh] flex items-center justify-center px-5 py-16">
      <div className="lux-card p-8 sm:p-10 max-w-md w-full text-center">
        <div className="hero-logo mx-auto mb-6" style={{ "--tam": "96px" } as React.CSSProperties}>
          <span className="hero-logo-glow" aria-hidden="true" />
          <span className="hero-logo-ring" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="Nicbeautty" className="hero-logo-img" width={96} height={96} />
        </div>
        <h1 className="font-heading text-3xl mb-2">Você está sem internet</h1>
        <p className="text-(--text-muted) mb-8">
          Assim que a conexão voltar, é só tocar em &ldquo;Tentar de novo&rdquo;. Se preferir, chame a
          Nicoly direto no WhatsApp.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/" className="btn btn-primary btn-block">
            Tentar de novo
          </Link>
          <a href={buildWhatsAppLink()} className="btn btn-outline btn-block" target="_blank" rel="noopener noreferrer">
            Abrir WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
