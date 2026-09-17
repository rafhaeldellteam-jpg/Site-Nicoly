"use client";

import Image from "next/image";
import type { ReactNode } from "react";

export function AdminIcon({
  children,
  size = 19,
}: {
  children: ReactNode;
  size?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

export function AdminAvatar({
  foto,
  nome,
  size = 40,
}: {
  foto?: string | null;
  nome: string;
  size?: number;
}) {
  const inicial = nome.trim().charAt(0).toUpperCase() || "?";
  if (!foto)
    return (
      <div
        className="relative shrink-0 rounded-full overflow-hidden aspect-square border border-(--border-color-strong)"
        style={{ width: size, height: size, minWidth: size, background: "var(--bg-tertiary)" }}
        aria-label={`Foto de ${nome}`}
      >
        <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-(--rose-gold)">
          {inicial}
        </span>
      </div>
    );
  return (
    <div
      className="relative shrink-0 rounded-full overflow-hidden aspect-square border border-(--border-color-strong)"
      style={{ width: size, height: size, minWidth: size, background: "#fff" }}
      aria-label={`Foto de ${nome}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={foto}
        alt={nome}
        className="absolute inset-0 w-full! h-full! object-cover"
      />
    </div>
  );
}

export function LogoSite({ size = 46 }: { size?: number }) {
  return (
    <div
      className="relative shrink-0 rounded-xl overflow-hidden border border-(--border-color)"
      style={{ width: size, height: size, background: "#fff" }}
    >
      <Image
        src="/images/logo-email.jpg"
        alt="Nicbeauty"
        fill
        sizes={`${size}px`}
        className="object-cover"
        unoptimized
      />
    </div>
  );
}

export function Vazio({ tabela }: { tabela: string }) {
  return (
    <div className="lux-card p-8 text-center max-w-xl mx-auto">
      <p className="text-(--text-muted)">
        As tabelas do painel ainda não existem no banco. Rode o arquivo{" "}
        <code className="text-(--rose-gold)">sql-painel-nicbeauty.sql</code> no SQL Editor do
        Supabase ({tabela}) e recarregue esta página.
      </p>
    </div>
  );
}

export function renovacaoInfo(inicio: string | null): { renovacao: Date; dias: number } {
  const base = inicio ? new Date(`${inicio}T12:00:00`) : new Date();
  const hoje = new Date();
  let ciclo = Math.max(0, Math.floor((hoje.getTime() - base.getTime()) / (30 * 86400000)));
  let renovacao = new Date(base.getTime() + (ciclo + 1) * 30 * 86400000);
  if (renovacao < hoje) {
    ciclo += 1;
    renovacao = new Date(base.getTime() + (ciclo + 1) * 30 * 86400000);
  }
  return {
    renovacao,
    dias: Math.max(0, Math.ceil((renovacao.getTime() - hoje.getTime()) / 86400000)),
  };
}
