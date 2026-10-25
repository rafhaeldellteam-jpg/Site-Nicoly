"use client";

import { useState } from "react";
import type { Assinatura } from "@/lib/types";
import { WhatsAppIcon } from "@/components/icons";
import { proximaRenovacao } from "@/lib/planos";
import {
  Badge,
  BarraAba,
  Campo,
  Carregando,
  ErroCarregar,
  Gaveta,
  ListaVazia,
  Secao,
  dinheiro,
  hojeLocal,
  linkWhatsCliente,
  useAcao,
  useDados,
} from "../ui";

const COR_STATUS: Record<string, "verde" | "amarelo" | "vermelho" | "neutro"> = {
  ativo: "verde",
  pendente: "amarelo",
  pausado: "neutro",
  cancelado: "vermelho",
};

export default function AbaPlanos() {
  const { dados, erro, recarregar } = useDados<Assinatura[]>(async () => {
    const { adminGetAssinaturas } = await import("@/lib/acoes/planos");
    return adminGetAssinaturas();
  });
  const acao = useAcao();
  const [novo, setNovo] = useState(false);

  if (erro) return <ErroCarregar aoTentar={recarregar} />;
  if (!dados) return <Carregando texto="Carregando assinaturas..." />;

  const pendentes = dados.filter((a) => a.status === "pendente");
  const outros = dados.filter((a) => a.status !== "pendente");
  const ativos = dados.filter((a) => a.status === "ativo");
  const receita = ativos.reduce((t, a) => t + Number(a.valor_mensal ?? 0), 0);

  async function mudarStatus(a: Assinatura, status: string) {
    if (status === "cancelado" && !confirm(`Cancelar o plano de ${a.cliente_nome}?`)) return;
    const { adminSetAssinaturaStatus } = await import("@/lib/acoes/planos");
    const r = await acao(
      () => adminSetAssinaturaStatus(a.id!, status),
      status === "ativo" && a.status === "pendente"
        ? a.cliente_email
          ? "Plano ativado! A cliente recebeu o e-mail de confirmação."
          : "Plano ativado!"
        : "Status atualizado."
    );
    if (r?.ok) recarregar();
  }

  async function lembrete(a: Assinatura) {
    const { adminSendLembreteAssinatura } = await import("@/lib/acoes/planos");
    await acao(async () => {
      const r = await adminSendLembreteAssinatura(a.id!);
      return { ok: r.ok, erro: r.msg };
    }, "Lembrete enviado por e-mail.");
  }

  async function remover(a: Assinatura) {
    if (!confirm(`Remover a assinatura de ${a.cliente_nome}? Isso apaga o registro.`)) return;
    const { adminDeleteAssinatura } = await import("@/lib/acoes/planos");
    const r = await acao(() => adminDeleteAssinatura(a.id!), "Assinatura removida.");
    if (r?.ok) recarregar();
  }

  const linha = (a: Assinatura) => {
    const ren = proximaRenovacao(a.inicio);
    return (
      <li key={a.id} className="adm-item">
        <div className="adm-item-info">
          <div className="flex items-center gap-2 flex-wrap">
            <strong className="truncate">{a.cliente_nome}</strong>
            <Badge cor={COR_STATUS[a.status ?? "ativo"] ?? "neutro"}>{a.status ?? "ativo"}</Badge>
            {a.status === "ativo" && (
              <Badge cor={ren.diasRestantes <= 5 ? "amarelo" : "neutro"}>
                renova em {ren.diasRestantes} {ren.diasRestantes === 1 ? "dia" : "dias"}
              </Badge>
            )}
          </div>
          <span className="truncate">
            {a.tecnica ?? "Plano mensal"} · {dinheiro(a.valor_mensal ?? 180)}/mês
          </span>
          <span className="truncate text-xs">
            {[a.cliente_whatsapp, a.cliente_email, a.inicio && `desde ${new Date(a.inicio + "T12:00:00").toLocaleDateString("pt-BR")}`]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        <div className="adm-item-acoes">
          {a.status === "pendente" && (
            <button className="btn btn-primary py-2! px-4! text-[0.8rem]!" onClick={() => mudarStatus(a, "ativo")}>
              Confirmar pagamento
            </button>
          )}
          <select
            className="input-lux w-auto! py-2! px-2! md:text-[0.8rem]!"
            value={a.status ?? "ativo"}
            aria-label={`Status do plano de ${a.cliente_nome}`}
            onChange={(e) => mudarStatus(a, e.target.value)}
          >
            <option value="pendente">Pendente</option>
            <option value="ativo">Ativo</option>
            <option value="pausado">Pausado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          {a.status === "ativo" && a.cliente_email && (
            <button className="btn btn-outline py-2! px-3! text-[0.78rem]!" onClick={() => lembrete(a)} title="Envia e-mail lembrando da renovação">
              Lembrete
            </button>
          )}
          {a.cliente_whatsapp && (
            <a href={linkWhatsCliente(a.cliente_whatsapp)} target="_blank" rel="noopener noreferrer" className="adm-whats" aria-label={`WhatsApp de ${a.cliente_nome}`}>
              <WhatsAppIcon size={18} />
            </a>
          )}
          <button className="adm-icone-btn perigo" onClick={() => remover(a)} aria-label={`Remover assinatura de ${a.cliente_nome}`} title="Remover">
            &times;
          </button>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <BarraAba resumo={`${ativos.length} ativos · ${dinheiro(receita)}/mês`}>
        <button className="btn btn-primary py-2.5! px-5! text-[0.88rem]!" onClick={() => setNovo(true)}>
          + Nova assinatura
        </button>
      </BarraAba>

      {pendentes.length > 0 && (
        <Secao titulo="Aguardando confirmação" descricao="Pedidos feitos pelo site. Combine o pagamento pelo WhatsApp e confirme aqui.">
          <ul className="adm-lista">
            {pendentes.map(linha)}
          </ul>
        </Secao>
      )}

      <Secao titulo="Assinaturas">
        {outros.length === 0 ? (
          <ListaVazia>Nenhuma assinatura ainda.</ListaVazia>
        ) : (
          <ul className="adm-lista">
            {outros.map(linha)}
          </ul>
        )}
      </Secao>

      <FormAssinatura aberta={novo} aoFechar={() => setNovo(false)} aoSalvar={recarregar} />
    </div>
  );
}

function FormAssinatura({ aberta, aoFechar, aoSalvar }: { aberta: boolean; aoFechar: () => void; aoSalvar: () => void }) {
  const acao = useAcao();
  const [nome, setNome] = useState("");
  const [whats, setWhats] = useState("");
  const [email, setEmail] = useState("");
  const [tecnica, setTecnica] = useState("");
  const [valor, setValor] = useState("180");
  const [inicio, setInicio] = useState(hojeLocal());
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    const { adminSaveAssinatura } = await import("@/lib/acoes/planos");
    const r = await acao(
      () =>
        adminSaveAssinatura({
          cliente_nome: nome,
          cliente_whatsapp: whats || null,
          cliente_email: email || null,
          tecnica: tecnica || null,
          valor_mensal: Number(valor.replace(",", ".")) || 180,
          inicio,
          status: "ativo",
        }),
      email ? "Assinatura salva! A cliente recebeu o e-mail." : "Assinatura salva!"
    );
    setSalvando(false);
    if (r?.ok) {
      setNome("");
      setWhats("");
      setEmail("");
      setTecnica("");
      aoSalvar();
      aoFechar();
    }
  }

  return (
    <Gaveta
      aberta={aberta}
      titulo="Nova assinatura VIP"
      aoFechar={aoFechar}
      rodape={
        <button className="btn btn-primary btn-block" disabled={salvando || nome.trim().length < 2} onClick={salvar}>
          {salvando ? "Salvando..." : "Salvar assinatura ativa"}
        </button>
      }
    >
      <div className="space-y-4">
        <Campo rotulo="Nome da cliente" obrigatorio>
          <input className="input-lux" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
        </Campo>
        <div className="adm-grade-form">
          <Campo rotulo="WhatsApp">
            <input className="input-lux" inputMode="tel" placeholder="(11) 99999-9999" value={whats} onChange={(e) => setWhats(e.target.value)} />
          </Campo>
          <Campo rotulo="E-mail" ajuda="Recebe a confirmação do plano">
            <input className="input-lux" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Campo>
          <Campo rotulo="Técnica">
            <input className="input-lux" placeholder="Ex.: Volume brasileiro" value={tecnica} onChange={(e) => setTecnica(e.target.value)} />
          </Campo>
          <Campo rotulo="Valor mensal (R$)">
            <input className="input-lux" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
          </Campo>
          <Campo rotulo="Início">
            <input type="date" className="input-lux" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </Campo>
        </div>
      </div>
    </Gaveta>
  );
}
