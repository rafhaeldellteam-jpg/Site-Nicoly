"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { PainelPlanos } from "@/lib/acoes/admin-planos";
import type { ResumoPlano } from "@/lib/planos-resumo";
import type { TipoEmailPlano } from "@/lib/emails";
import { WhatsAppIcon } from "@/components/icons";
import { VIP_MANUTENCOES } from "@/lib/planos";
import { BarrasEmpilhadas } from "../graficos";
import { BarraCiclo, Bolinhas, Numero, Variacao } from "../anima";
import {
  Badge,
  BarraAba,
  Campo,
  Carregando,
  ErroCarregar,
  Gaveta,
  ListaVazia,
  Secao,
  dataCurta,
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

const reais = (v: number) => Math.round(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function nomeMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return new Date(a, m - 1, 15).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

export default function AbaPlanos() {
  const { dados, erro, recarregar } = useDados<PainelPlanos>(async () => {
    const { adminPainelPlanos } = await import("@/lib/acoes/admin-planos");
    return adminPainelPlanos();
  });
  const acao = useAcao();
  const [novo, setNovo] = useState(false);
  const [emailPara, setEmailPara] = useState<ResumoPlano | null>(null);
  const [filtro, setFiltro] = useState<"ativos" | "todos">("ativos");

  if (erro) return <ErroCarregar aoTentar={recarregar} />;
  if (!dados) return <Carregando texto="Carregando os planos..." />;

  const { ganhos: g, resumos } = dados;
  const pendentes = resumos.filter((a) => a.status === "pendente");
  const outros = resumos
    .filter((a) => a.status !== "pendente" && (filtro === "todos" || a.status === "ativo"))
    .sort((a, b) => (a.ciclo?.diasRestantes ?? 999) - (b.ciclo?.diasRestantes ?? 999));

  async function mudarStatus(a: ResumoPlano, status: string) {
    if (status === "cancelado" && !confirm(`Cancelar o plano de ${a.nome}?`)) return;
    const { adminSetAssinaturaStatus } = await import("@/lib/acoes/planos");
    const r = await acao(
      () => adminSetAssinaturaStatus(a.id, status),
      status === "ativo" && a.status === "pendente"
        ? a.email
          ? "Plano ativado e 1ª mensalidade registrada! A cliente recebeu o e-mail."
          : "Plano ativado e 1ª mensalidade registrada!"
        : "Status atualizado."
    );
    if (r?.ok) recarregar();
  }

  async function pagamento(a: ResumoPlano, pagar: boolean) {
    const { adminRegistrarPagamento, adminDesfazerPagamento } = await import("@/lib/acoes/admin-planos");
    const r = await acao(
      () => (pagar ? adminRegistrarPagamento(a.id) : adminDesfazerPagamento(a.id)),
      pagar ? `Mensalidade de ${a.nome.split(" ")[0]} registrada! 💰` : "Pagamento desfeito."
    );
    if (r?.ok) recarregar();
  }

  async function remover(a: ResumoPlano) {
    if (!confirm(`Remover a assinatura de ${a.nome}? Isso apaga o registro e as mensalidades dela.`)) return;
    const { adminDeleteAssinatura } = await import("@/lib/acoes/planos");
    const r = await acao(() => adminDeleteAssinatura(a.id), "Assinatura removida.");
    if (r?.ok) recarregar();
  }

  const cartao = (a: ResumoPlano, i: number) => {
    const c = a.ciclo;
    return (
      <li key={a.id} className={`vip-cartao ${a.status}`} style={{ "--d": `${i * 60}ms` } as CSSProperties}>
        <div className="vip-topo">
          <div className="vip-avatar" aria-hidden="true">
            {a.nome.trim().charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <strong className="block truncate">{a.nome}</strong>
            <span className="block truncate text-xs text-(--text-muted)">
              {a.tecnica ?? "Plano mensal"} · {reais(a.valor)}/mês
              {a.meses > 0 && ` · ${a.meses} ${a.meses === 1 ? "mês" : "meses"} no VIP`}
            </span>
          </div>
          <Badge cor={COR_STATUS[a.status] ?? "neutro"}>{a.status}</Badge>
        </div>

        {c ? (
          <>
            <div className="vip-ciclo">
              <div className="flex justify-between text-xs mb-1.5">
                <span>
                  Renova em <b>{c.diasRestantes} {c.diasRestantes === 1 ? "dia" : "dias"}</b> · {dataCurta(c.renovacao)}
                </span>
                <span className="text-(--text-muted)">{Math.round(c.progresso * 100)}%</span>
              </div>
              <BarraCiclo progresso={c.progresso} alerta={c.diasRestantes <= 5} />
            </div>
            <div className="vip-infos">
              <div>
                <small>Manutenções no mês</small>
                <Bolinhas usadas={a.usadasCiclo} total={VIP_MANUTENCOES} />
              </div>
              <div>
                <small>{a.proxima ? "Próxima sessão" : "Sugestão de manutenção"}</small>
                <b className={a.proxima ? "" : "text-(--rose-gold)"}>
                  {a.proxima ? `${dataCurta(a.proxima.data)} · ${a.proxima.horario}` : a.sugestao ? `a partir de ${dataCurta(a.sugestao)}` : "—"}
                </b>
              </div>
              <div>
                <small>Mensalidade deste mês</small>
                {a.pagoCiclo === null ? (
                  <b className="text-(--text-muted)">—</b>
                ) : a.pagoCiclo ? (
                  <button type="button" className="vip-pago" onClick={() => pagamento(a, false)} title="Desfazer se foi marcado por engano">
                    ✓ paga
                  </button>
                ) : (
                  <button type="button" className="vip-pagar" onClick={() => pagamento(a, true)}>
                    Registrar pagamento
                  </button>
                )}
              </div>
              <div>
                <small>Já pagou no total</small>
                <b>{a.pagoCiclo === null ? "—" : reais(a.totalPago)}</b>
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-(--text-muted) mt-3">
            {[a.whatsapp, a.email, a.inicio && `desde ${dataCurta(a.inicio, true)}`, a.canceladoEm && `cancelado em ${dataCurta(a.canceladoEm, true)}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}

        <div className="vip-acoes">
          {a.status === "pendente" && (
            <button className="btn btn-primary py-2! px-4! text-[0.8rem]!" onClick={() => mudarStatus(a, "ativo")}>
              Confirmar pagamento
            </button>
          )}
          {a.status === "ativo" && (
            <button
              className="btn btn-outline py-2! px-3! text-[0.78rem]!"
              onClick={() => setEmailPara(a)}
              disabled={!a.email}
              title={a.email ? `Enviar e-mail para ${a.email}` : "Sem e-mail cadastrado"}
            >
              ✉ E-mail
            </button>
          )}
          <select
            className="input-lux w-auto! py-2! px-2! md:text-[0.8rem]!"
            value={a.status}
            aria-label={`Status do plano de ${a.nome}`}
            onChange={(e) => mudarStatus(a, e.target.value)}
          >
            <option value="pendente">Pendente</option>
            <option value="ativo">Ativo</option>
            <option value="pausado">Pausado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          {a.whatsapp && (
            <a href={linkWhatsCliente(a.whatsapp)} target="_blank" rel="noopener noreferrer" className="adm-whats" aria-label={`WhatsApp de ${a.nome}`}>
              <WhatsAppIcon size={18} />
            </a>
          )}
          <button className="adm-icone-btn perigo ml-auto" onClick={() => remover(a)} aria-label={`Remover assinatura de ${a.nome}`} title="Remover">
            &times;
          </button>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-7">
      <BarraAba resumo={`${g.ativos} ativas · ${reais(g.mrr)}/mês`}>
        <button className="btn btn-primary py-2.5! px-5! text-[0.88rem]!" onClick={() => setNovo(true)}>
          + Nova assinatura
        </button>
      </BarraAba>

      {g.semTabela && (
        <p className="fin-alerta">
          <strong>Ganhos estimados</strong>
          <span>Rode o SQL 009 no Supabase para registrar cada mensalidade e ativar os e-mails automáticos do VIP.</span>
        </p>
      )}

      <div className="ds-cards ds-cards-4">
        {[
          { r: "Receita VIP por mês", v: g.mrr, d: `${g.ativos} ${g.ativos === 1 ? "cliente" : "clientes"} · ${reais(g.ticketMedio)} cada` },
          { r: "Recebido neste mês", v: g.recebidoMes, d: <Variacao atual={g.recebidoMes} anterior={g.recebidoMesAnterior} /> },
          { r: "Em aberto neste ciclo", v: g.emAbertoValor, d: `${g.emAbertoQtd} ${g.emAbertoQtd === 1 ? "mensalidade" : "mensalidades"} sem registro`, alerta: g.emAbertoQtd > 0 },
          { r: "Total recebido em planos", v: g.recebidoTotal, d: `permanência média de ${g.permanenciaMedia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} meses` },
        ].map((c, i) => (
          <div key={c.r} className={`ds-card ${c.alerta ? "alerta" : ""}`} style={{ "--d": `${i * 70}ms` } as CSSProperties}>
            <span className="ds-card-rotulo">{c.r}</span>
            <strong>
              <Numero valor={c.v} formatar={reais} />
            </strong>
            <span className="ds-card-detalhe">{c.d}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Secao titulo="Mensalidades recebidas" descricao="Últimos 6 meses">
          <div className="lux-card p-4 md:p-5">
            <BarrasEmpilhadas
              dados={g.porMes.map((m) => ({ rotulo: nomeMes(m.mes), dica: nomeMes(m.mes), valores: [m.valor] }))}
              series={[{ cor: "var(--viz-3)", rotulo: "Mensalidades" }]}
              formatar={(v) => (v >= 1000 ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : `R$ ${Math.round(v)}`)}
              destaque={g.porMes.length - 1}
              alturaPx={190}
            />
          </div>
        </Secao>
        <Secao titulo="Renovam em 7 dias">
          {g.renovam7.length === 0 ? (
            <ListaVazia>Nenhuma renovação nesta semana.</ListaVazia>
          ) : (
            <ul className="ds-vip-lista lux-card p-4">
              {g.renovam7.map((r) => (
                <li key={r.id}>
                  <span className="truncate">{r.nome}</span>
                  <small>{dataCurta(r.renovacao)}</small>
                  <b>{reais(r.valor)}</b>
                </li>
              ))}
            </ul>
          )}
        </Secao>
      </div>

      {pendentes.length > 0 && (
        <Secao titulo="Aguardando confirmação" descricao="Pedidos feitos pelo site. Combine o pagamento pelo WhatsApp e confirme aqui — o plano começa a contar no dia da confirmação.">
          <ul className="vip-grade">{pendentes.map(cartao)}</ul>
        </Secao>
      )}

      <Secao
        titulo="Assinaturas"
        descricao="E-mails automáticos: aviso 5 dias antes da renovação e lembrete de manutenção quando a cliente fica ~15 dias sem horário marcado."
        acoes={
          <div className="adm-segmento">
            <button className={filtro === "ativos" ? "on" : ""} onClick={() => setFiltro("ativos")}>
              Ativas
            </button>
            <button className={filtro === "todos" ? "on" : ""} onClick={() => setFiltro("todos")}>
              Todas
            </button>
          </div>
        }
      >
        {outros.length === 0 ? <ListaVazia>Nenhuma assinatura aqui ainda.</ListaVazia> : <ul className="vip-grade">{outros.map(cartao)}</ul>}
      </Secao>

      <FormAssinatura aberta={novo} aoFechar={() => setNovo(false)} aoSalvar={recarregar} />
      <EmailPlano assinatura={emailPara} aoFechar={() => setEmailPara(null)} />
    </div>
  );
}

/* ================= E-MAIL PERSONALIZADO ================= */

const TIPOS: { id: TipoEmailPlano; rotulo: string; dica: string }[] = [
  { id: "resumo", rotulo: "Resumo do plano", dica: "Dias restantes, manutenções e próxima sessão" },
  { id: "renovacao", rotulo: "Renovação", dica: "Avisa quanto falta para renovar" },
  { id: "manutencao", rotulo: "Hora da manutenção", dica: "Convida para marcar o próximo horário" },
];

function EmailPlano({ assinatura, aoFechar }: { assinatura: ResumoPlano | null; aoFechar: () => void }) {
  const acao = useAcao();
  const [tipo, setTipo] = useState<TipoEmailPlano>("resumo");
  const [mensagem, setMensagem] = useState("");
  const [previa, setPrevia] = useState<{ assunto: string; html: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const id = assinatura?.id;

  // monta a prévia (espera a Nicoly parar de digitar)
  useEffect(() => {
    if (!id) return;
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const { adminPreviaEmailPlano } = await import("@/lib/acoes/admin-planos");
        const r = await adminPreviaEmailPlano(id, tipo, mensagem);
        if (vivo && r.ok && r.html) setPrevia({ assunto: r.assunto ?? "", html: r.html });
      } catch {
        /* a prévia é só um extra */
      }
    }, 450);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [id, tipo, mensagem]);

  function fechar() {
    setMensagem("");
    setTipo("resumo");
    setPrevia(null);
    aoFechar();
  }

  async function enviar() {
    if (!id) return;
    setEnviando(true);
    const { adminEnviarEmailPlano } = await import("@/lib/acoes/admin-planos");
    const r = await acao(() => adminEnviarEmailPlano(id, tipo, mensagem), `E-mail enviado para ${assinatura?.email}! ✉️`);
    setEnviando(false);
    if (r?.ok) fechar();
  }

  return (
    <Gaveta
      aberta={!!assinatura}
      titulo={`E-mail para ${assinatura?.nome.split(" ")[0] ?? ""}`}
      aoFechar={fechar}
      rodape={
        <button className="btn btn-primary btn-block" disabled={enviando || !assinatura?.email} onClick={enviar}>
          {enviando ? "Enviando..." : `Enviar para ${assinatura?.email ?? ""}`}
        </button>
      }
    >
      <div className="space-y-4">
        <div className="email-tipos">
          {TIPOS.map((t) => (
            <button key={t.id} type="button" className={tipo === t.id ? "on" : ""} onClick={() => setTipo(t.id)}>
              <b>{t.rotulo}</b>
              <small>{t.dica}</small>
            </button>
          ))}
        </div>
        <Campo rotulo="Recado da Nicoly (opcional)" ajuda="Aparece em destaque no e-mail, assinado por você.">
          <textarea
            className="input-lux min-h-24"
            maxLength={800}
            placeholder="Ex.: Amei o resultado da última vez! Que tal já garantir seu horário de sábado?"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
          />
        </Campo>
        <div>
          <p className="adm-rotulo mb-2">Prévia{previa ? ` · assunto: “${previa.assunto}”` : ""}</p>
          <div className="email-previa">
            {previa ? (
              <iframe title="Prévia do e-mail" srcDoc={previa.html} sandbox="" />
            ) : (
              <p className="text-sm text-(--text-muted) p-6">Montando a prévia...</p>
            )}
          </div>
        </div>
      </div>
    </Gaveta>
  );
}

/* ================= NOVA ASSINATURA ================= */

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
          <Campo rotulo="E-mail" ajuda="Recebe a confirmação e os avisos do plano">
            <input className="input-lux" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Campo>
          <Campo rotulo="Técnica">
            <input className="input-lux" placeholder="Ex.: Volume brasileiro" value={tecnica} onChange={(e) => setTecnica(e.target.value)} />
          </Campo>
          <Campo rotulo="Valor mensal (R$)">
            <input className="input-lux" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
          </Campo>
          <Campo rotulo="Início" ajuda="A 1ª mensalidade fica registrada como paga">
            <input type="date" className="input-lux" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </Campo>
        </div>
      </div>
    </Gaveta>
  );
}
