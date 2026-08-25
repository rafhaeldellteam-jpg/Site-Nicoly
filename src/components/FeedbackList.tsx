"use client";

import { useState } from "react";
import type { Feedback } from "@/lib/types";
import { IconHeart, IconStar } from "@/components/icons";

export default function FeedbackList({ items }: { items: Feedback[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="text-center text-(--text-muted) py-8">
        Ainda não há avaliações publicadas. Seja a primeira!{" "}
        <IconHeart size={13} className="inline-block -mt-[2px] text-(--rose-gold)" />
      </p>
    );
  }

  return (
    <>
      <div className="max-w-[800px] mx-auto flex flex-col gap-5">
        {items.map((f) => (
          <article key={f.id} className="lux-card rounded-3xl! p-6 md:p-7">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <strong className="text-lg">{f.nome}</strong>
                {f.instagram && (
                  <a
                    href={`https://instagram.com/${f.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-(--rose-gold) hover:text-(--rose-gold-light)"
                  >
                    {f.instagram.startsWith("@") ? f.instagram : `@${f.instagram}`}
                  </a>
                )}
              </div>
              <div className="flex gap-0.5 text-(--rose-gold)" aria-label={`${f.estrelas} estrelas`}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <IconStar key={i} size={15} className={i <= f.estrelas ? "" : "opacity-25"} />
                ))}
              </div>
            </div>

            {f.comentario && (
              <p className="text-(--text-muted) leading-relaxed">{f.comentario}</p>
            )}

            {f.imagens && f.imagens.length > 0 && (
              <div className="flex gap-2 mt-4 flex-wrap">
                {f.imagens.map((u, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={u}
                    alt={`Foto de ${f.nome} ${i + 1}`}
                    loading="lazy"
                    onClick={() => setLightbox(u)}
                    className="w-20 h-20 object-cover rounded-xl border border-(--border-color) cursor-zoom-in hover:border-(--rose-gold) transition-colors"
                  />
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Foto ampliada" onClick={(e) => e.stopPropagation()} />
          <button className="modal-close" onClick={() => setLightbox(null)} aria-label="Fechar">
            &times;
          </button>
        </div>
      )}
    </>
  );
}
