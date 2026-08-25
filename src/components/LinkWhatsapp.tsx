"use client";

import { ReactNode } from "react";
import { buildWhatsAppLink } from "@/lib/supabase";
import { rastrearCliqueWhatsapp } from "@/lib/rastreio";

export default function LinkWhatsapp({
  origem,
  message,
  className,
  children,
}: {
  origem: string;
  message?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={buildWhatsAppLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => rastrearCliqueWhatsapp(origem)}
      className={className}
    >
      {children}
    </a>
  );
}
