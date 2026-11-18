"use client";

import { useState } from "react";
import type { Manutencao, Service } from "@/lib/types";
import { duracaoDoServico, formatarDuracao, parseDuracaoMin } from "@/lib/agenda";
import { IconStar } from "@/components/icons";
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
  dinheiro,
  useAcao,
  useDados,
} from "../ui";

const DURACOES = [30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 210, 240];

/** "1.250,50" → 1250.5 · "130.5" → 130.5 · "" → null */
function precoNumero(txt: string): number | null {
  const t = txt.trim();
  if (!t) return null;
  const normal = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  return Number(normal);
}

export default function AbaCatalogo() {
  const { dados, erro, recarregar } = useDados<Service[]>(async () => {
    const { adminGetAllServices } = await import("@/lib/acoes/admin-site");
    return adminGetAllServices();
  });
  const acao = useAcao();
  const [editando, setEditando] = useState<Partial<Service> | null>(null);
  const [busca, setBusca] = useState("");

  if (erro) return <ErroCarregar aoTentar={recarregar} />;
  if (!dados) return <Carregando texto="Carregando catálogo..." />;

  const termo = busca.trim().toLowerCase();
  const lista = dados.filter((s) => !termo || s.nome.toLowerCase().includes(termo));
  const ativos = dados.filter((s) => s.ativo !== false).length;

  async function alternarAtivo(s: Service) {
    const { adminSaveService } = await import("@/lib/acoes/admin-site");
    const r = await acao(
      () => adminSaveService({ ...s, ativo: s.ativo === false }),
      s.ativo === false ? `"${s.nome}" voltou para o site.` : `"${s.nome}" foi escondido do site.`
    );
    if (r?.ok) recarregar();
  }

  async function mover(s: Service, direcao: -1 | 1) {
    const idx = dados!.findIndex((x) => x.id === s.id);
    const outro = dados![idx + direcao];
    if (!outro) return;
    const { adminSaveService } = await import("@/lib/acoes/admin-site");
    // grava a ordem de todos para ficar consistente
    const novaOrdem = [...dados!];
    novaOrdem[idx] = outro;
    novaOrdem[idx + direcao] = s;
    const r = await acao(async () => {
      for (const [i, item] of novaOrdem.entries()) {
        if ((item.ordem ?? -1) !== i + 1) {
          const res = await adminSaveService({ ...item, ordem: i + 1 });
          if (!res.ok) return res;
        }
      }
      return { ok: true };
    });
    if (r?.ok) recarregar();
  }

  return (
    <div className="space-y-6">
      <BarraAba resumo={`${dados.length} serviços · ${ativos} aparecendo no site`}>
        <input className="input-lux py-2! md:text-sm! sm:w-52!" placeholder="Buscar serviço..." value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar serviço" />
        <button className="btn btn-primary py-2.5! px-5! text-[0.88rem]!" onClick={() => setEditando({ ativo: true, manutencao: [] })}>
          + Novo serviço
        </button>
      </BarraAba>

      {lista.length === 0 ? (
        <ListaVazia>{termo ? "Nenhum serviço com esse nome." : "Nenhum serviço cadastrado. Toque em “+ Novo serviço”."}</ListaVazia>
      ) : (
        <ul className="adm-grade-cards">
          {lista.map((s) => {
            const pos = dados.findIndex((x) => x.id === s.id);
            return (
              <li key={s.id} className={`adm-servico ${s.ativo === false ? "inativo" : ""}`}>
                <button type="button" className="adm-servico-foto" onClick={() => setEditando(s)} aria-label={`Editar ${s.nome}`}>
                  {s.imagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.imagem} alt="" loading="lazy" />
                  ) : (
                    <span>sem foto</span>
                  )}
                  {s.destaque && (
                    <em>
                      <IconStar size={10} /> Mais pedido
                    </em>
                  )}
                </button>
                <div className="p-4 flex-1 flex flex-col gap-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <strong className="leading-tight">{s.nome}</strong>
                    <span className="text-(--rose-gold) font-semibold whitespace-nowrap">{dinheiro(s.preco)}</span>
                  </div>
                  <span className="text-xs text-(--text-muted)">
                    {formatarDuracao(duracaoDoServico(s))}
                    {s.aplicacao ? ` · ${s.aplicacao}` : ""}
                  </span>
                  <div className="flex gap-1.5 flex-wrap mt-1">
                    {s.ativo === false ? <Badge cor="neutro">escondido</Badge> : <Badge cor="verde">no site</Badge>}
                    {!s.imagem && <Badge cor="amarelo">sem foto</Badge>}
                    {s.preco == null && <Badge cor="amarelo">sem preço</Badge>}
                  </div>
                  <div className="flex gap-2 mt-auto pt-3 flex-wrap">
                    <button className="btn btn-primary flex-1 py-2! px-3! text-[0.8rem]!" onClick={() => setEditando(s)}>
                      Editar
                    </button>
                    <button className="btn btn-outline py-2! px-3! text-[0.8rem]!" onClick={() => alternarAtivo(s)}>
                      {s.ativo === false ? "Mostrar" : "Esconder"}
                    </button>
                    {!termo && (
                      <span className="flex gap-1">
                        <button className="adm-icone-btn" disabled={pos === 0} onClick={() => mover(s, -1)} aria-label="Subir na ordem" title="Subir">
                          ↑
                        </button>
                        <button className="adm-icone-btn" disabled={pos === dados.length - 1} onClick={() => mover(s, 1)} aria-label="Descer na ordem" title="Descer">
                          ↓
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editando && (
        <EditorServico
          key={editando.id ?? "novo"}
          servico={editando}
          proximaOrdem={dados.length + 1}
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

function EditorServico({
  servico,
  proximaOrdem,
  aoFechar,
  aoSalvar,
}: {
  servico: Partial<Service>;
  proximaOrdem: number;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const acao = useAcao();
  const novo = !servico.id;
  const [nome, setNome] = useState(servico.nome ?? "");
  const [descricao, setDescricao] = useState(servico.descricao ?? "");
  const [preco, setPreco] = useState(servico.preco != null ? String(servico.preco).replace(".", ",") : "");
  const [duracaoMin, setDuracaoMin] = useState<number>(
    servico.duracao_min ?? parseDuracaoMin(servico.duracao) ?? 120
  );
  const [duracaoTexto, setDuracaoTexto] = useState(servico.duracao ?? "");
  const [aplicacao, setAplicacao] = useState(servico.aplicacao ?? "");
  const [manutencao, setManutencao] = useState<Manutencao[]>(servico.manutencao?.length ? servico.manutencao : []);
  const [textobotao, setTextobotao] = useState(servico.textobotao ?? "");
  const [imagem, setImagem] = useState(servico.imagem ?? "");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [ativo, setAtivo] = useState(servico.ativo !== false);
  const [destaque, setDestaque] = useState(servico.destaque === true);
  const [salvando, setSalvando] = useState(false);

  const opcoesDuracao = DURACOES.includes(duracaoMin) ? DURACOES : [...DURACOES, duracaoMin].sort((a, b) => a - b);

  async function salvar() {
    setSalvando(true);
    const { adminSaveService, uploadServiceImage } = await import("@/lib/acoes/admin-site");

    let urlFinal = imagem.trim() || null;
    if (arquivo) {
      const up = await acao(async () => {
        const r = await uploadServiceImage(arquivo);
        return { ok: !!r.url, erro: r.erro, url: r.url };
      });
      if (!up?.ok) {
        setSalvando(false);
        return;
      }
      urlFinal = up.url ?? null;
    }

    const r = await acao(
      () =>
        adminSaveService({
          id: servico.id,
          nome,
          descricao,
          preco: precoNumero(preco),
          duracao_min: duracaoMin,
          duracao: duracaoTexto.trim() || formatarDuracao(duracaoMin),
          aplicacao,
          manutencao,
          textobotao,
          imagem: urlFinal,
          ativo,
          destaque,
          ordem: servico.ordem ?? proximaOrdem,
        }),
      novo ? "Serviço cadastrado! Já aparece no site." : "Alterações salvas."
    );
    setSalvando(false);
    if (r?.ok) aoSalvar();
  }

  async function excluir() {
    if (!servico.id || !confirm(`Excluir "${servico.nome}" do catálogo? Agendamentos antigos continuam no histórico.`)) return;
    const { adminDeleteService } = await import("@/lib/acoes/admin-site");
    const r = await acao(() => adminDeleteService(servico.id!), "Serviço excluído.");
    if (r?.ok) aoSalvar();
  }

  return (
    <Gaveta
      aberta
      titulo={novo ? "Novo serviço" : `Editar: ${servico.nome}`}
      aoFechar={aoFechar}
      rodape={
        <div className="flex gap-2">
          {!novo && (
            <button className="btn btn-danger py-3! px-4!" onClick={excluir} disabled={salvando}>
              Excluir
            </button>
          )}
          <button className="btn btn-primary flex-1" onClick={salvar} disabled={salvando || nome.trim().length < 2}>
            {salvando ? "Salvando..." : novo ? "Cadastrar serviço" : "Salvar alterações"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <CampoImagem url={imagem} arquivo={arquivo} aoMudarUrl={setImagem} aoMudarArquivo={setArquivo} rotulo="Foto do serviço" formato="largo" />

        <Campo rotulo="Nome do serviço" obrigatorio>
          <input className="input-lux" maxLength={80} placeholder="Ex.: Volume Brasileiro" value={nome} onChange={(e) => setNome(e.target.value)} />
        </Campo>

        <Campo rotulo="Descrição" ajuda={`${descricao.length}/600`}>
          <textarea className="input-lux resize-y min-h-[90px]" maxLength={600} placeholder="O que é, para quem é indicado, resultado..." value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </Campo>

        <div className="adm-grade-form">
          <Campo rotulo="Preço (R$)" ajuda="Deixe vazio para não mostrar preço">
            <input className="input-lux" inputMode="decimal" placeholder="130,00" value={preco} onChange={(e) => setPreco(e.target.value.replace(/[^\d.,]/g, ""))} />
          </Campo>
          <Campo rotulo="Tempo de atendimento" obrigatorio ajuda="Usado para saber em quais horários o serviço cabe">
            <select className="input-lux" value={duracaoMin} onChange={(e) => setDuracaoMin(Number(e.target.value))}>
              {opcoesDuracao.map((m) => (
                <option key={m} value={m}>
                  {formatarDuracao(m)}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Tempo exibido no site" ajuda={`Opcional. Se vazio, mostra “${formatarDuracao(duracaoMin)}”.`}>
            <input className="input-lux" maxLength={40} placeholder="Ex.: 2h a 2h30" value={duracaoTexto} onChange={(e) => setDuracaoTexto(e.target.value)} />
          </Campo>
          <Campo rotulo="Aplicação" ajuda="Texto curto exibido no catálogo">
            <input className="input-lux" maxLength={120} placeholder="Ex.: Fios em Y, efeito volumoso" value={aplicacao} onChange={(e) => setAplicacao(e.target.value)} />
          </Campo>
        </div>

        <div className="adm-campo">
          <span className="adm-rotulo">Manutenções</span>
          <div className="space-y-2">
            {manutencao.map((m, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  className="input-lux py-2!"
                  placeholder="Valor (R$ 90,00)"
                  value={m.valor}
                  onChange={(e) => setManutencao((l) => l.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))}
                  aria-label={`Valor da manutenção ${i + 1}`}
                />
                <input
                  className="input-lux py-2!"
                  placeholder="Prazo (até 15 dias)"
                  value={m.prazo}
                  onChange={(e) => setManutencao((l) => l.map((x, j) => (j === i ? { ...x, prazo: e.target.value } : x)))}
                  aria-label={`Prazo da manutenção ${i + 1}`}
                />
                <button type="button" className="adm-icone-btn perigo shrink-0" onClick={() => setManutencao((l) => l.filter((_, j) => j !== i))} aria-label="Remover manutenção">
                  &times;
                </button>
              </div>
            ))}
            {manutencao.length < 6 && (
              <button type="button" className="text-sm text-(--rose-gold) hover:underline" onClick={() => setManutencao((l) => [...l, { valor: "", prazo: "" }])}>
                + Adicionar manutenção
              </button>
            )}
          </div>
        </div>

        <Campo rotulo="Texto do botão" ajuda={`Se vazio: “Agendar ${nome || "serviço"}”`}>
          <input className="input-lux" maxLength={40} placeholder="Ex.: Quero esse!" value={textobotao} onChange={(e) => setTextobotao(e.target.value)} />
        </Campo>

        <div className="space-y-3 pt-1">
          <Interruptor ligado={ativo} aoMudar={setAtivo} rotulo="Aparece no site" descricao="Desligado: fica salvo, mas some do catálogo e do agendamento." />
          <Interruptor ligado={destaque} aoMudar={setDestaque} rotulo="Destaque “Mais pedido”" descricao="Mostra uma faixa dourada no catálogo." />
        </div>
      </div>
    </Gaveta>
  );
}
