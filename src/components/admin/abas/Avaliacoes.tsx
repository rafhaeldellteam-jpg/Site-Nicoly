"use client";

import { useState } from "react";
import type { Feedback } from "@/lib/types";
import { IconCheck, IconStar } from "@/components/icons";
import { Badge, BarraAba, Carregando, ErroCarregar, ListaVazia, Secao, useAcao, useDados } from "../ui";

export default function AbaAvaliacoes() {
  const { dados, erro, recarregar } = useDados<Feedback[]>(async () => {
    const { adminGetFeedbacks } = await import("@/lib/acoes/admin-site");
    return adminGetFeedbacks();
  });
  const acao = useAcao();
  const [foto, setFoto] = useState<string | null>(null);

  if (erro) return <ErroCarregar aoTentar={recarregar} />;
  if (!dados) return <Carregando texto="Carregando avaliações..." />;

  const pendentes = dados.filter((f) => !f.aprovado);
  const noAr = dados.filter((f) => f.aprovado);
  const media = noAr.length ? noAr.reduce((t, f) => t + f.estrelas, 0) / noAr.length : 0;

  async function aprovar(f: Feedback, aprovado: boolean) {
    const { adminSetFeedbackAprovado } = await import("@/lib/acoes/admin-site");
    const r = await acao(() => adminSetFeedbackAprovado(f.id, aprovado), aprovado ? "Avaliação publicada no site." : "Avaliação retirada do site.");
    if (r?.ok) recarregar();
  }

  async function excluir(f: Feedback) {
    if (!confirm(`Excluir a avaliação de ${f.nome}?`)) return;
    const { adminDeleteFeedback } = await import("@/lib/acoes/admin-site");
    const r = await acao(() => adminDeleteFeedback(f.id), "Avaliação excluída.");
    if (r?.ok) recarregar();
  }

  const cartao = (f: Feedback) => (
    <li key={f.id} className="lux-card p-4 sm:p-5">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <strong>{f.nome}</strong>
        <span className="flex gap-0.5 text-(--rose-gold)" aria-label={`${f.estrelas} estrelas`}>
          {Array.from({ length: f.estrelas }).map((_, i) => (
            <IconStar key={i} size={13} />
          ))}
        </span>
        <Badge cor={f.aprovado ? "verde" : "amarelo"}>{f.aprovado ? "no site" : "aguardando"}</Badge>
      </div>
      {f.instagram && <span className="block text-sm text-(--rose-gold-light)">@{f.instagram.replace(/^@/, "")}</span>}
      {f.comentario && <p className="text-sm text-(--text-muted) mt-1 whitespace-pre-line">{f.comentario}</p>}
      {f.imagens && f.imagens.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {f.imagens.map((u, i) => (
            <button key={i} type="button" onClick={() => setFoto(u)} className="rounded-lg overflow-hidden border border-(--border-color)" aria-label="Ampliar foto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" loading="lazy" className="w-16 h-16 object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-4 flex-wrap">
        {f.aprovado ? (
          <button onClick={() => aprovar(f, false)} className="btn btn-outline flex-1 sm:flex-none py-2! px-4! text-[0.8rem]!">
            Tirar do site
          </button>
        ) : (
          <button onClick={() => aprovar(f, true)} className="btn btn-primary flex-1 sm:flex-none py-2! px-4! text-[0.8rem]!">
            <IconCheck size={13} /> Aprovar
          </button>
        )}
        <button onClick={() => excluir(f)} className="btn btn-danger py-2! px-4! text-[0.8rem]!">
          Excluir
        </button>
      </div>
    </li>
  );

  return (
    <div className="space-y-6">
      <BarraAba resumo={noAr.length ? `${noAr.length} no site · média ${media.toFixed(1).replace(".", ",")} estrelas` : "Nenhuma avaliação publicada ainda"} />

      <Secao titulo="Aguardando aprovação" descricao="Só aparecem na página inicial depois de aprovadas.">
        {pendentes.length === 0 ? (
          <ListaVazia>Tudo em dia! Nenhuma avaliação esperando.</ListaVazia>
        ) : (
          <ul className="adm-grade-cards">
            {pendentes.map(cartao)}
          </ul>
        )}
      </Secao>

      {noAr.length > 0 && (
        <Secao titulo="Publicadas no site">
          <ul className="adm-grade-cards">
            {noAr.map(cartao)}
          </ul>
        </Secao>
      )}

      {foto && (
        <div className="lightbox-overlay" onClick={() => setFoto(null)} role="dialog" aria-label="Foto ampliada">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foto} alt="" />
        </div>
      )}
    </div>
  );
}
