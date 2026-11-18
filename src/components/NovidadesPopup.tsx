"use client";

import { useCallback, useEffect, useState } from "react";
import { useModal } from "@/lib/use-modal";
import { buildWhatsAppLink } from "@/lib/supabase";
import { rastrearCliqueWhatsapp } from "@/lib/rastreio";
import { IconSparkle, WhatsAppIcon } from "@/components/icons";
import type { Novidade } from "@/lib/types";

const CHAVE_VISTAS = "nic_novidades_vistas";

const ROTULO_TIPO: Record<string, string> = {
  promocao: "Promoção",
  evento: "Evento",
  novidade: "Novidade",
};

function lerVistas(): number[] {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE_VISTAS) ?? "[]");
  } catch {
    return [];
  }
}

function marcarVista(id?: number): void {
  if (!id) return;
  try {
    const v = new Set(lerVistas());
    v.add(id);
    sessionStorage.setItem(CHAVE_VISTAS, JSON.stringify([...v]));
  } catch {
    /* ignora */
  }
}

function dataBR(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

export function textoPeriodo(n: Pick<Novidade, "inicio" | "fim">): string | null {
  if (n.inicio && n.fim && n.inicio === n.fim) return `Somente em ${dataBR(n.inicio)}`;
  if (n.fim) return `Válido até ${dataBR(n.fim)}`;
  return null;
}

/**
 * Mostra o botão "Saiba mais" com a novidade do momento ao abrir o site e,
 * ao tocar, a janela com os detalhes. Configurado no painel → Novidades.
 */
export default function NovidadesPopup() {
  const [itens, setItens] = useState<Novidade[]>([]);
  const [aberto, setAberto] = useState(false);
  const [indice, setIndice] = useState(0);
  const [pilulaVisivel, setPilulaVisivel] = useState(false);

  useEffect(() => {
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const { getNovidadesAtivas } = await import("@/lib/acoes/novidades");
        const lista = await getNovidadesAtivas();
        if (!vivo || lista.length === 0) return;
        setItens(lista);
        const vistas = lerVistas();
        const naoVistas = lista.filter((n) => n.id && !vistas.includes(n.id));
        if (naoVistas.length === 0) return;
        setPilulaVisivel(true);
        const automatica = naoVistas.find((n) => n.abrir_automatico);
        if (automatica) {
          setIndice(lista.indexOf(automatica));
          setTimeout(() => vivo && setAberto(true), 900);
        }
      } catch {
        /* sem internet ou tabela ainda não criada — não mostra nada */
      }
    }, 1200);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, []);

  const fechar = useCallback(() => {
    setAberto(false);
    setPilulaVisivel(false);
    for (const n of itens) marcarVista(n.id);
  }, [itens]);

  useModal(aberto, fechar);

  if (itens.length === 0) return null;
  const atual = itens[Math.min(indice, itens.length - 1)];
  const periodo = textoPeriodo(atual);

  return (
    <>
      {pilulaVisivel && !aberto && (
        <div className="novidade-pilula" role="status">
          <button type="button" className="novidade-pilula-btn" onClick={() => setAberto(true)}>
            <span className="novidade-pilula-icone" aria-hidden="true">
              <IconSparkle size={13} />
            </span>
            <span className="truncate">{atual.chamada || atual.titulo}</span>
            <strong>Saiba mais</strong>
          </button>
          <button
            type="button"
            className="novidade-pilula-x"
            aria-label="Dispensar novidade"
            onClick={() => {
              setPilulaVisivel(false);
              for (const n of itens) marcarVista(n.id);
            }}
          >
            &times;
          </button>
        </div>
      )}

      {aberto && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && fechar()}>
          <div
            className="modal-container novidade-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="novidade-titulo"
          >
            <button className="modal-close" onClick={fechar} aria-label="Fechar">
              &times;
            </button>

            {atual.imagem && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={atual.imagem} alt="" className="novidade-imagem" />
            )}

            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className={`novidade-tag t-${atual.tipo ?? "novidade"}`}>
                  {ROTULO_TIPO[atual.tipo ?? "novidade"] ?? "Novidade"}
                </span>
                {periodo && <span className="text-xs text-(--text-muted)">{periodo}</span>}
              </div>
              <h3 id="novidade-titulo" className="font-heading text-[1.8rem] leading-tight mb-3">
                {atual.titulo}
              </h3>
              {atual.descricao && (
                <p className="text-(--text-muted) leading-relaxed whitespace-pre-line mb-6">{atual.descricao}</p>
              )}

              <BotaoAcao novidade={atual} aoClicar={fechar} />

              {itens.length > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <button
                    type="button"
                    className="text-sm text-(--text-muted) hover:text-(--rose-gold) px-2 py-1"
                    onClick={() => setIndice((i) => (i - 1 + itens.length) % itens.length)}
                  >
                    ‹ Anterior
                  </button>
                  <div className="flex gap-1.5" aria-label={`Novidade ${indice + 1} de ${itens.length}`}>
                    {itens.map((n, i) => (
                      <span
                        key={n.id ?? i}
                        className={`w-2 h-2 rounded-full ${i === indice ? "bg-(--rose-gold)" : "bg-white/20"}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="text-sm text-(--text-muted) hover:text-(--rose-gold) px-2 py-1"
                    onClick={() => setIndice((i) => (i + 1) % itens.length)}
                  >
                    Próxima ›
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BotaoAcao({ novidade, aoClicar }: { novidade: Novidade; aoClicar: () => void }) {
  const acao = novidade.botao_acao ?? "agendar";
  if (acao === "nenhum") return null;

  if (acao === "whatsapp") {
    return (
      <a
        href={buildWhatsAppLink(`Olá! Vi no site: "${novidade.titulo}" e quero saber mais.`)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          rastrearCliqueWhatsapp("novidades");
          aoClicar();
        }}
        className="btn btn-primary btn-block"
      >
        <WhatsAppIcon size={18} /> {novidade.botao_texto || "Quero saber mais"}
      </a>
    );
  }

  if (acao === "link" && novidade.botao_link) {
    const externo = novidade.botao_link.startsWith("http");
    return (
      <a
        href={novidade.botao_link}
        {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        onClick={aoClicar}
        className="btn btn-primary btn-block"
      >
        {novidade.botao_texto || "Saiba mais"}
      </a>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-primary btn-block"
      onClick={() => {
        aoClicar();
        window.dispatchEvent(new CustomEvent("abrir-agendamento"));
      }}
    >
      {novidade.botao_texto || "Agendar horário"}
    </button>
  );
}
