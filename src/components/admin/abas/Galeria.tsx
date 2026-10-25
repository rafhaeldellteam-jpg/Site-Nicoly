"use client";

import { useState } from "react";
import type { GaleriaItem } from "@/lib/types";
import { BarraAba, Campo, CampoImagem, Carregando, ErroCarregar, Gaveta, ListaVazia, useAcao, useDados } from "../ui";

export default function AbaGaleria() {
  const { dados, erro, recarregar } = useDados<GaleriaItem[]>(async () => {
    const { adminGetGaleria } = await import("@/lib/acoes/admin-site");
    return adminGetGaleria();
  });
  const [editando, setEditando] = useState<Partial<GaleriaItem> | null>(null);

  if (erro) return <ErroCarregar aoTentar={recarregar} />;
  if (!dados) return <Carregando texto="Carregando galeria..." />;

  return (
    <div className="space-y-6">
      <BarraAba resumo={dados.length ? `${dados.length} fotos na página inicial` : "Sem fotos: o site mostra as fotos padrão"}>
        <button className="btn btn-primary py-2.5! px-5! text-[0.88rem]!" onClick={() => setEditando({ ordem: dados.length + 1 })}>
          + Adicionar foto
        </button>
      </BarraAba>

      {dados.length === 0 ? (
        <ListaVazia>Nenhuma foto cadastrada ainda. As fotos aparecem na seção “Galeria de Transformações”.</ListaVazia>
      ) : (
        <ul className="adm-grade-fotos">
          {dados.map((g) => (
            <li key={g.id}>
              <button type="button" className="adm-foto" onClick={() => setEditando(g)} aria-label={`Editar ${g.titulo}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.imagem} alt="" loading="lazy" />
                <span>
                  <strong>{g.titulo}</strong>
                  {g.descricao && <small>{g.descricao}</small>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <EditorFoto
          key={editando.id ?? "nova"}
          item={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={() => {
            setEditando(null);
            recarregar();
          }}
        />
      )}
    </div>
  );
}

function EditorFoto({ item, aoFechar, aoSalvar }: { item: Partial<GaleriaItem>; aoFechar: () => void; aoSalvar: () => void }) {
  const acao = useAcao();
  const nova = !item.id;
  const [titulo, setTitulo] = useState(item.titulo ?? "");
  const [descricao, setDescricao] = useState(item.descricao ?? "");
  const [ordem, setOrdem] = useState(String(item.ordem ?? 0));
  const [url, setUrl] = useState(item.imagem ?? "");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    const { adminSaveGaleria, uploadGaleriaImagem } = await import("@/lib/acoes/admin-site");
    let imagem = url.trim();
    if (arquivo) {
      const up = await acao(async () => {
        const r = await uploadGaleriaImagem(arquivo);
        return { ok: !!r.url, erro: r.erro, url: r.url };
      });
      if (!up?.ok || !up.url) {
        setSalvando(false);
        return;
      }
      imagem = up.url;
    }
    const r = await acao(
      () => adminSaveGaleria({ id: item.id, titulo, descricao: descricao || null, imagem, ordem: Number(ordem) || 0 }),
      nova ? "Foto adicionada ao site." : "Foto atualizada."
    );
    setSalvando(false);
    if (r?.ok) aoSalvar();
  }

  async function excluir() {
    if (!item.id || !confirm(`Remover "${item.titulo}" da galeria?`)) return;
    const { adminDeleteGaleria } = await import("@/lib/acoes/admin-site");
    const r = await acao(() => adminDeleteGaleria(item.id!), "Foto removida.");
    if (r?.ok) aoSalvar();
  }

  return (
    <Gaveta
      aberta
      titulo={nova ? "Nova foto" : "Editar foto"}
      aoFechar={aoFechar}
      rodape={
        <div className="flex gap-2">
          {!nova && (
            <button className="btn btn-danger py-3! px-4!" onClick={excluir} disabled={salvando}>
              Excluir
            </button>
          )}
          <button className="btn btn-primary flex-1" onClick={salvar} disabled={salvando || !titulo.trim() || (!url.trim() && !arquivo)}>
            {salvando ? "Enviando..." : nova ? "Adicionar à galeria" : "Salvar"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <CampoImagem url={url} arquivo={arquivo} aoMudarUrl={setUrl} aoMudarArquivo={setArquivo} />
        <Campo rotulo="Título" obrigatorio>
          <input className="input-lux" maxLength={60} placeholder="Ex.: Volume Brasileiro" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </Campo>
        <Campo rotulo="Descrição curta">
          <input className="input-lux" maxLength={120} placeholder="Ex.: Fios em Y com efeito marcante" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </Campo>
        <Campo rotulo="Posição" ajuda="Números menores aparecem primeiro">
          <input className="input-lux" inputMode="numeric" value={ordem} onChange={(e) => setOrdem(e.target.value.replace(/\D/g, ""))} />
        </Campo>
      </div>
    </Gaveta>
  );
}
