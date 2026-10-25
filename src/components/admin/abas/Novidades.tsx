"use client";

import { useState } from "react";
import type { Novidade } from "@/lib/types";
import { textoPeriodo } from "@/components/NovidadesPopup";
import {
  Badge,
  BarraAba,
  Campo,
  CampoImagem,
  Carregando,
  ErroCarregar,
  Gaveta,
  Interruptor,
  ListaVazia,
  Secao,
  hojeLocal,
  useAcao,
  useDados,
} from "../ui";

type Modo = "sempre" | "dias" | "data" | "periodo";

const TIPOS: [string, string][] = [
  ["promocao", "Promoção"],
  ["evento", "Evento"],
  ["novidade", "Novidade"],
];

const MODOS: { v: Modo; titulo: string; desc: string }[] = [
  { v: "sempre", titulo: "Sempre", desc: "Fica no ar até você desligar" },
  { v: "dias", titulo: "Por alguns dias", desc: "Ex.: 7 dias a partir de hoje" },
  { v: "data", titulo: "Em uma data", desc: "Só em um dia específico" },
  { v: "periodo", titulo: "De uma data até outra", desc: "Ex.: 01/12 até 24/12" },
];

function situacao(n: Novidade, hoje: string): { cor: "verde" | "amarelo" | "neutro" | "vermelho"; texto: string } {
  if (n.ativo === false) return { cor: "neutro", texto: "desligada" };
  if (n.inicio && n.inicio > hoje)
    return { cor: "amarelo", texto: `começa ${new Date(n.inicio + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}` };
  if (n.fim && n.fim < hoje) return { cor: "vermelho", texto: "encerrada" };
  return { cor: "verde", texto: "no ar agora" };
}

export default function AbaNovidades() {
  const { dados, erro, recarregar } = useDados(async () => {
    const { adminGetNovidades } = await import("@/lib/acoes/novidades");
    return adminGetNovidades();
  });
  const acao = useAcao();
  const [editando, setEditando] = useState<Partial<Novidade> | null>(null);

  if (erro) return <ErroCarregar aoTentar={recarregar} />;
  if (!dados) return <Carregando texto="Carregando novidades..." />;

  if (dados.semTabela)
    return (
      <ListaVazia>
        Falta criar a tabela de novidades. Rode o arquivo <code className="text-(--rose-gold)">sql-painel-v2.sql</code> no SQL Editor do Supabase e
        recarregue esta página.
      </ListaVazia>
    );

  const hoje = hojeLocal();
  const itens = dados.itens;
  const noAr = itens.filter((n) => situacao(n, hoje).texto === "no ar agora");

  async function alternar(n: Novidade) {
    const { adminSetNovidadeAtiva } = await import("@/lib/acoes/novidades");
    const r = await acao(() => adminSetNovidadeAtiva(n.id!, n.ativo === false), n.ativo === false ? "Novidade ligada." : "Novidade desligada.");
    if (r?.ok) recarregar();
  }

  return (
    <div className="space-y-6">
      <BarraAba resumo={noAr.length ? `${noAr.length} aparecendo no site agora` : "Nenhuma novidade no ar agora"}>
        <button
          className="btn btn-primary py-2.5! px-5! text-[0.88rem]!"
          onClick={() => setEditando({ tipo: "promocao", modo: "dias", botao_acao: "agendar", ativo: true, abrir_automatico: true })}
        >
          + Nova novidade
        </button>
      </BarraAba>

      <Secao titulo="Como funciona" className="text-sm text-(--text-muted)">
        <p>
          Quando uma novidade está no ar, o site mostra um botão <strong className="text-(--rose-gold)">“Saiba mais”</strong> no topo da página.
          Ao tocar, abre uma janela com a imagem, o texto e o botão de ação. Se você marcar “Abrir sozinha”, a janela abre assim que a cliente
          entra no site (uma vez por visita).
        </p>
      </Secao>

      {itens.length === 0 ? (
        <ListaVazia>Nenhuma novidade criada. Que tal divulgar uma promoção?</ListaVazia>
      ) : (
        <ul className="adm-grade-cards">
          {itens.map((n) => {
            const st = situacao(n, hoje);
            const periodo = textoPeriodo(n);
            return (
              <li key={n.id} className="adm-servico">
                <button type="button" className="adm-servico-foto" onClick={() => setEditando(n)} aria-label={`Editar ${n.titulo}`}>
                  {n.imagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={n.imagem} alt="" loading="lazy" />
                  ) : (
                    <span>sem imagem</span>
                  )}
                </button>
                <div className="p-4 flex-1 flex flex-col gap-1 min-w-0">
                  <div className="flex gap-1.5 flex-wrap">
                    <Badge cor={st.cor}>{st.texto}</Badge>
                    <Badge cor="rose">{TIPOS.find(([v]) => v === n.tipo)?.[1] ?? "Novidade"}</Badge>
                  </div>
                  <strong className="leading-tight mt-1">{n.titulo}</strong>
                  <span className="text-xs text-(--text-muted)">
                    {n.modo === "sempre" || !n.modo ? "Sem data para acabar" : periodo ?? ""}
                    {n.inicio && n.inicio !== n.fim ? ` · desde ${new Date(n.inicio + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}` : ""}
                  </span>
                  <div className="flex gap-2 mt-auto pt-3">
                    <button className="btn btn-primary flex-1 py-2! px-3! text-[0.8rem]!" onClick={() => setEditando(n)}>
                      Editar
                    </button>
                    <button className="btn btn-outline py-2! px-3! text-[0.8rem]!" onClick={() => alternar(n)}>
                      {n.ativo === false ? "Ligar" : "Desligar"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editando && (
        <EditorNovidade
          key={editando.id ?? "nova"}
          n={editando}
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

function diasEntre(a: string, b: string): number {
  return Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 86400000) + 1;
}

function EditorNovidade({ n, aoFechar, aoSalvar }: { n: Partial<Novidade>; aoFechar: () => void; aoSalvar: () => void }) {
  const acao = useAcao();
  const nova = !n.id;
  const hoje = hojeLocal();
  const [tipo, setTipo] = useState(n.tipo ?? "promocao");
  const [titulo, setTitulo] = useState(n.titulo ?? "");
  const [chamada, setChamada] = useState(n.chamada ?? "");
  const [descricao, setDescricao] = useState(n.descricao ?? "");
  const [imagem, setImagem] = useState(n.imagem ?? "");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [botaoAcao, setBotaoAcao] = useState(n.botao_acao ?? "agendar");
  const [botaoTexto, setBotaoTexto] = useState(n.botao_texto ?? "");
  const [botaoLink, setBotaoLink] = useState(n.botao_link ?? "");
  const [modo, setModo] = useState<Modo>((n.modo as Modo) ?? "dias");
  const [inicio, setInicio] = useState(n.inicio ?? hoje);
  const [fim, setFim] = useState(n.fim ?? "");
  const [dias, setDias] = useState(String(n.modo === "dias" && n.inicio && n.fim ? diasEntre(n.inicio, n.fim) : 7));
  const [abrirSozinha, setAbrirSozinha] = useState(n.abrir_automatico !== false);
  const [ativo, setAtivo] = useState(n.ativo !== false);
  const [salvando, setSalvando] = useState(false);

  const fimDias = (() => {
    const d = Number(dias);
    if (!inicio || !Number.isFinite(d) || d < 1) return null;
    const dt = new Date(inicio + "T12:00:00");
    dt.setDate(dt.getDate() + d - 1);
    return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
  })();

  async function salvar() {
    setSalvando(true);
    let url = imagem.trim() || null;
    if (arquivo) {
      const { uploadNovidadeImagem } = await import("@/lib/acoes/novidades");
      const up = await acao(async () => {
        const r = await uploadNovidadeImagem(arquivo);
        return { ok: !!r.url, erro: r.erro, url: r.url };
      });
      if (!up?.ok) {
        setSalvando(false);
        return;
      }
      url = up.url ?? null;
    }
    const { adminSaveNovidade } = await import("@/lib/acoes/novidades");
    const r = await acao(
      () =>
        adminSaveNovidade({
          id: n.id,
          tipo,
          titulo,
          chamada,
          descricao,
          imagem: url,
          botao_acao: botaoAcao,
          botao_texto: botaoTexto,
          botao_link: botaoLink,
          modo,
          inicio: modo === "sempre" ? null : inicio,
          fim: modo === "periodo" ? fim : null,
          dias: modo === "dias" ? Number(dias) : null,
          abrir_automatico: abrirSozinha,
          ativo,
        }),
      nova ? "Novidade criada!" : "Novidade atualizada."
    );
    setSalvando(false);
    if (r?.ok) aoSalvar();
  }

  async function excluir() {
    if (!n.id || !confirm(`Excluir a novidade "${n.titulo}"?`)) return;
    const { adminDeleteNovidade } = await import("@/lib/acoes/novidades");
    const r = await acao(() => adminDeleteNovidade(n.id!), "Novidade excluída.");
    if (r?.ok) aoSalvar();
  }

  const podeSalvar =
    titulo.trim().length >= 3 &&
    (modo !== "periodo" || (inicio && fim && fim >= inicio)) &&
    (modo !== "data" || !!inicio) &&
    (modo !== "dias" || Number(dias) >= 1) &&
    (botaoAcao !== "link" || /^(https:\/\/|\/)/.test(botaoLink.trim()));

  return (
    <Gaveta
      aberta
      titulo={nova ? "Nova novidade" : "Editar novidade"}
      aoFechar={aoFechar}
      rodape={
        <div className="flex gap-2">
          {!nova && (
            <button className="btn btn-danger py-3! px-4!" onClick={excluir} disabled={salvando}>
              Excluir
            </button>
          )}
          <button className="btn btn-primary flex-1" onClick={salvar} disabled={salvando || !podeSalvar}>
            {salvando ? "Salvando..." : nova ? "Publicar novidade" : "Salvar"}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="adm-filtros" role="radiogroup" aria-label="Tipo">
          {TIPOS.map(([v, r]) => (
            <button key={v} type="button" role="radio" aria-checked={tipo === v} className={tipo === v ? "on" : ""} onClick={() => setTipo(v)}>
              {r}
            </button>
          ))}
        </div>

        <Campo rotulo="Título" obrigatorio>
          <input className="input-lux" maxLength={90} placeholder="Ex.: Black Friday: 20% off no Volume Brasileiro" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </Campo>
        <Campo rotulo="Frase do “Saiba mais”" ajuda="Aparece no botão do topo do site. Se vazio, usa o título.">
          <input className="input-lux" maxLength={80} placeholder="Ex.: 20% off esta semana" value={chamada} onChange={(e) => setChamada(e.target.value)} />
        </Campo>
        <Campo rotulo="Texto da janela" ajuda={`${descricao.length}/1200 · pode usar quebras de linha`}>
          <textarea className="input-lux resize-y min-h-[110px]" maxLength={1200} placeholder="Detalhes da promoção ou do evento, regras, como participar..." value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </Campo>
        <CampoImagem url={imagem} arquivo={arquivo} aoMudarUrl={setImagem} aoMudarArquivo={setArquivo} rotulo="Imagem (opcional)" formato="largo" />

        <fieldset className="adm-fieldset">
          <legend>Botão da janela</legend>
          <div className="adm-grade-form">
            <Campo rotulo="O que o botão faz">
              <select className="input-lux" value={botaoAcao} onChange={(e) => setBotaoAcao(e.target.value)}>
                <option value="agendar">Abrir o agendamento</option>
                <option value="whatsapp">Abrir o WhatsApp</option>
                <option value="link">Ir para um link</option>
                <option value="nenhum">Sem botão</option>
              </select>
            </Campo>
            {botaoAcao !== "nenhum" && (
              <Campo rotulo="Texto do botão">
                <input
                  className="input-lux"
                  maxLength={40}
                  placeholder={botaoAcao === "whatsapp" ? "Quero saber mais" : botaoAcao === "link" ? "Saiba mais" : "Agendar horário"}
                  value={botaoTexto}
                  onChange={(e) => setBotaoTexto(e.target.value)}
                />
              </Campo>
            )}
            {botaoAcao === "link" && (
              <Campo rotulo="Link" obrigatorio ajuda="https://... ou uma página do site, ex.: /planos" className="sm:col-span-2">
                <input className="input-lux" placeholder="/planos" value={botaoLink} onChange={(e) => setBotaoLink(e.target.value)} />
              </Campo>
            )}
          </div>
        </fieldset>

        <fieldset className="adm-fieldset">
          <legend>Quando aparece no site</legend>
          <div className="adm-modos" role="radiogroup">
            {MODOS.map((m) => (
              <button key={m.v} type="button" role="radio" aria-checked={modo === m.v} className={modo === m.v ? "on" : ""} onClick={() => setModo(m.v)}>
                <strong>{m.titulo}</strong>
                <span>{m.desc}</span>
              </button>
            ))}
          </div>

          {modo === "dias" && (
            <div className="adm-grade-form mt-4">
              <Campo rotulo="Quantos dias">
                <input className="input-lux" inputMode="numeric" value={dias} onChange={(e) => setDias(e.target.value.replace(/\D/g, "").slice(0, 3))} />
              </Campo>
              <Campo rotulo="A partir de">
                <input type="date" className="input-lux" value={inicio} onChange={(e) => setInicio(e.target.value)} />
              </Campo>
              {fimDias && <p className="text-xs text-(--rose-gold-light) sm:col-span-2">Fica no ar até {fimDias} (inclusive).</p>}
            </div>
          )}
          {modo === "data" && (
            <div className="adm-grade-form mt-4">
              <Campo rotulo="Data">
                <input type="date" className="input-lux" value={inicio} onChange={(e) => setInicio(e.target.value)} />
              </Campo>
            </div>
          )}
          {modo === "periodo" && (
            <div className="adm-grade-form mt-4">
              <Campo rotulo="De">
                <input type="date" className="input-lux" value={inicio} onChange={(e) => setInicio(e.target.value)} />
              </Campo>
              <Campo rotulo="Até">
                <input type="date" className="input-lux" min={inicio} value={fim} onChange={(e) => setFim(e.target.value)} />
              </Campo>
            </div>
          )}
        </fieldset>

        <div className="space-y-3">
          <Interruptor ligado={abrirSozinha} aoMudar={setAbrirSozinha} rotulo="Abrir sozinha ao entrar no site" descricao="Desligado: aparece só o botão “Saiba mais”." />
          <Interruptor ligado={ativo} aoMudar={setAtivo} rotulo="Ligada" descricao="Desligue para tirar do ar sem apagar." />
        </div>

        {/* prévia */}
        <div>
          <span className="adm-rotulo">Prévia</span>
          <div className="adm-previa-novidade">
            <div className="novidade-pilula-btn pointer-events-none">
              <span className="novidade-pilula-icone" aria-hidden="true">✦</span>
              <span className="truncate">{chamada || titulo || "Sua novidade"}</span>
              <strong>Saiba mais</strong>
            </div>
          </div>
        </div>
      </div>
    </Gaveta>
  );
}
