"use client";

import type { ReactNode } from "react";

export function BookingButton({ children, className = "btn btn-primary" }: { children?: ReactNode; className?: string }) {
  return (
    <button
      className={className}
      onClick={() => window.dispatchEvent(new CustomEvent("abrir-agendamento"))}
    >
      {children}
    </button>
  );
}

export function FeedbackButton({ children, className = "btn btn-primary" }: { children?: ReactNode; className?: string }) {
  return (
    <button
      className={className}
      onClick={() => window.dispatchEvent(new CustomEvent("abrir-feedback"))}
    >
      {children}
    </button>
  );
}

export function ServiceBookingButton({
  serviceId,
  children,
  className,
}: {
  serviceId: number;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <button
      className={className ?? "btn btn-primary btn-block"}
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent("abrir-agendamento", { detail: { serviceId } })
        )
      }
    >
      {children}
    </button>
  );
}
