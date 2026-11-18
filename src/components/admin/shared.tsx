"use client";

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


/** Logo do estúdio (mesma dos e-mails), usada no topo do menu do painel. */
export function LogoSite({ size = 40 }: { size?: number }) {
  return (
    <div
      className="relative shrink-0 rounded-full overflow-hidden border border-(--border-color-strong)"
      style={{ width: size, height: size, minWidth: size, background: "#fff" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/logo-email.jpg" alt="Nicbeautty" className="absolute inset-0 w-full! h-full! object-cover" />
    </div>
  );
}
