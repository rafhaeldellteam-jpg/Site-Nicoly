"use client";

import { useEffect, useState } from "react";
import type { Feedback } from "@/lib/types";
import { IconCheck, IconStar } from "@/components/icons";
import { Badge, BarraAba, Carregando, ErroCarregar, ListaVazia, Secao, useAcao, useDados } from "../ui";

export default function AbaAvaliacoes() {
  const { dados, erro, recarregar } = useDados<Feedback[]>(async () => {
    const { adminGetFeedbacks } = await import("@/lib/acoes/admin-site");
    return adminGetFeedbacks();
  });
  const acao = useAcao();
  const [linkGoogle, setLinkGoogle] = useState<string | null>(null);
  const [salvandoLink, setSalvandoLink] = useState(false);

  useEffect(() => {
    import("@/lib/acoes/configuracoes")
      .then(({ getConfiguracao }) => getConfiguracao("google_avaliacao_url"))
      .then((v) => setLinkGoogle(v ?? ""))
      .catch(() => setLinkGoogle(""));
  }, []);

  async function salvarLink() {
    if (linkGoogle === null) return;
    setSalvandoLink(true);
    const { adminSetConfiguracao } = await import("@/lib/acoes/configuracoes");
    await acao(() => adminSetConfiguracao("google_avaliacao_url", linkGoogle), linkGoogle ? "Link do Google salvo. O botão do site já usa ele." : "Link removido.");
    setSalvandoLink(false);
  }
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
      <Secao titulo="Avaliar no Google" descricao="Link do botão “Avaliar no Google” da página inicial">
        <div className="lux-card p-4 md:p-5 space-y-3">
          <p className="text-sm text-(--text-muted)">
            No celular, abra o app <strong>Google Maps</strong> ou o <strong>Perfil da Empresa no Google</strong> → “Pedir avaliações” → copie o
            link e cole aqui. Enquanto estiver vazio, o botão abre a busca da Nicbeautty no Google.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="input-lux py-2!"
              placeholder="https://g.page/r/..."
              value={linkGoogle ?? ""}
              disabled={linkGoogle === null}
              onChange={(e) => setLinkGoogle(e.target.value)}
              aria-label="Link de avaliação do Google"
            />
            <button className="btn btn-primary py-2.5! px-5! text-[0.85rem]! shrink-0" onClick={salvarLink} disabled={salvandoLink || linkGoogle === null}>
              {salvandoLink ? "Salvando..." : "Salvar link"}
            </button>
          </div>
        </div>
      </Secao>

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
