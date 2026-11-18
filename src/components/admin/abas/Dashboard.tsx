"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { DashboardData } from "@/lib/types";
import type { Financeiro } from "@/lib/acoes/admin-relatorios";
import type { PainelPlanos } from "@/lib/acoes/admin-planos";
import { VIP_MANUTENCOES } from "@/lib/planos";
import { WhatsAppIcon } from "@/components/icons";
import { BarrasEmpilhadas, Legenda } from "../graficos";
import { Anel, BarraCiclo, Bolinhas, Numero, Tendencia, Variacao, saudacao } from "../anima";
import { Badge, Carregando, ErroCarregar, ListaVazia, Secao, dataCurta, dinheiro, linkWhatsCliente, useAcao, useDados } from "../ui";
import type { Aba } from "../navegacao";

type Visao = { painel: DashboardData; fin: Financeiro | null; planos: PainelPlanos | null };

const COR_ATEND = "var(--viz-1)";
const COR_PLANOS = "var(--viz-3)";
const COR_AGENDADO = "var(--viz-2)";

function nomeMes(mes: string, curto = true): string {
  const [a, m] = mes.split("-").map(Number);
  return new Date(a, m - 1, 15)
    .toLocaleDateString("pt-BR", curto ? { month: "short" } : { month: "long", year: "numeric" })
    .replace(".", "");
}

const reaisCurto = (v: number) =>
  v >= 1000 ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : `R$ ${Math.round(v)}`;
const reais = (v: number) => Math.round(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

async function carregar(): Promise<Visao> {
  const [{ adminDashboard }, { adminFinanceiro }, { adminPainelPlanos }] = await Promise.all([
    import("@/lib/acoes/admin-agenda"),
    import("@/lib/acoes/admin-relatorios"),
    import("@/lib/acoes/admin-planos"),
  ]);
  const [painel, fin, planos] = await Promise.all([
    adminDashboard(),
    adminFinanceiro().catch(() => null),
    adminPainelPlanos().catch(() => null),
  ]);
  return { painel, fin, planos };
}

export default function AbaDashboard({ irPara, nome }: { irPara: (a: Aba) => void; nome?: string }) {
  const { dados, erro, recarregar } = useDados<Visao>(carregar);
  const [atualizado, setAtualizado] = useState<Date | null>(null);

  // atualiza sozinho a cada 60s enquanto a aba estiver aberta e visível
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") recarregar().then(() => setAtualizado(new Date()));
    }, 60000);
    return () => clearInterval(t);
  }, [recarregar]);

  if (erro) return <ErroCarregar aoTentar={recarregar} />;
  if (!dados) return <Carregando texto="Preparando seu painel..." />;

  const { painel, fin, planos } = dados;
  const g = planos?.ganhos;
  const faturadoMes = (fin?.recebidoMes ?? 0) + (fin?.planosMes ?? 0);
  const faturadoAnterior = (fin?.recebidoMesAnterior ?? 0) + (fin?.planosMesAnterior ?? 0);
  const vaiEntrar = (fin?.proximos30Agendado ?? 0) + (g?.mrr ?? fin?.vipMensal ?? 0);
  const pendencias = painel.avaliacoes_pendentes + painel.planos_pendentes + (g?.emAbertoQtd ?? 0);
  const hoje = new Date();
  const proximoHoje = painel.proximos.find((a) => a.appointment_date === fin?.hoje);
  const mesAtual = fin?.hoje.slice(0, 7) ?? "";

  const cards: {
    rotulo: string;
    valor: number;
    formatar?: (v: number) => string;
    detalhe: React.ReactNode;
    aba?: Aba;
    alerta?: boolean;
    icone: string;
  }[] = [
    {
      rotulo: "Faturado no mês",
      valor: faturadoMes,
      formatar: reais,
      detalhe: <Variacao atual={faturadoMes} anterior={faturadoAnterior} />,
      aba: "financeiro",
      icone: "💰",
    },
    {
      rotulo: "Vai entrar em 30 dias",
      valor: vaiEntrar,
      formatar: reais,
      detalhe: <span>horários marcados + mensalidades VIP</span>,
      aba: "financeiro",
      icone: "📈",
    },
    {
      rotulo: "Receita VIP por mês",
      valor: g?.mrr ?? fin?.vipMensal ?? 0,
      formatar: reais,
      detalhe: (
        <span>
          {painel.assinaturas_ativas} {painel.assinaturas_ativas === 1 ? "cliente VIP ativa" : "clientes VIP ativas"}
        </span>
      ),
      aba: "planos",
      icone: "👑",
    },
    {
      rotulo: "Atendimentos hoje",
      valor: painel.agendados_hoje,
      detalhe: <span>{painel.proximos_7_dias} nos próximos 7 dias</span>,
      aba: "agendamentos",
      icone: "🗓️",
    },
    {
      rotulo: "Ticket médio",
      valor: fin?.ticketMedio90 ?? 0,
      formatar: reais,
      detalhe: <span>por atendimento (90 dias)</span>,
      aba: "financeiro",
      icone: "✨",
    },
    {
      rotulo: "Pendências",
      valor: pendencias,
      detalhe: (
        <span>
          {[
            painel.planos_pendentes && `${painel.planos_pendentes} plano(s)`,
            painel.avaliacoes_pendentes && `${painel.avaliacoes_pendentes} avaliação(ões)`,
            g?.emAbertoQtd && `${g.emAbertoQtd} mensalidade(s)`,
          ]
            .filter(Boolean)
            .join(" · ") || "tudo em dia"}
        </span>
      ),
      aba: painel.planos_pendentes || g?.emAbertoQtd ? "planos" : "avaliacoes",
      alerta: pendencias > 0,
      icone: "🔔",
    },
  ];

  return (
    <div className="space-y-8">
      {/* ===== boas-vindas + meta do mês ===== */}
      <section className="ds-hero">
        <div className="ds-hero-brilho" aria-hidden="true" />
        <div className="ds-hero-texto">
          <p className="ds-hero-data">
            {hoje.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
          <h2 className="font-heading">
            {saudacao(hoje)}, <span className="ouro-texto">{nome?.split(" ")[0] ?? "Nicoly"}</span> ✨
          </h2>
          <p className="ds-hero-resumo">
            {painel.agendados_hoje === 0
              ? "Nenhum atendimento hoje — bom dia para divulgar e organizar a agenda."
              : `Hoje você tem ${painel.agendados_hoje} ${painel.agendados_hoje === 1 ? "atendimento" : "atendimentos"}${
                  proximoHoje ? `; o próximo é às ${proximoHoje.appointment_time.slice(0, 5)} com ${proximoHoje.client_name.split(" ")[0]}` : ""
                }.`}
          </p>
          {fin && (
            <div className="ds-hero-linha">
              <Tendencia valores={fin.meses.slice(0, 6).map((m) => m.recebido + m.planos)} />
              <span>faturamento dos últimos 6 meses</span>
            </div>
          )}
        </div>
        {fin && <MetaDoMes faturado={faturadoMes} meta={fin.meta} mes={mesAtual} aoSalvar={recarregar} />}
      </section>

      {/* ===== números principais ===== */}
      <div className="ds-cards">
        {cards.map((c, i) => (
          <button
            key={c.rotulo}
            type="button"
            onClick={() => c.aba && irPara(c.aba)}
            className={`ds-card ${c.alerta ? "alerta" : ""}`}
            style={{ "--d": `${i * 70}ms` } as CSSProperties}
          >
            <span className="ds-card-icone" aria-hidden="true">
              {c.icone}
            </span>
            <span className="ds-card-rotulo">{c.rotulo}</span>
            <strong>
              <Numero valor={c.valor} formatar={c.formatar} />
            </strong>
            <span className="ds-card-detalhe">{c.detalhe}</span>
          </button>
        ))}
      </div>

      {/* ===== faturamento por mês ===== */}
      {fin && (
        <Secao titulo="Faturamento por mês" descricao="Atendimentos concluídos, mensalidades do VIP recebidas e o que já está agendado">
          <div className="lux-card p-4 md:p-5">
            <Legenda
              itens={[
                { cor: COR_ATEND, rotulo: "Atendimentos" },
                { cor: COR_PLANOS, rotulo: "Planos VIP" },
                { cor: COR_AGENDADO, rotulo: "Agendado (vai entrar)" },
              ]}
            />
            <BarrasEmpilhadas
              dados={fin.meses.map((m) => ({
                rotulo: nomeMes(m.mes),
                dica: nomeMes(m.mes, false),
                valores: [m.recebido, m.planos, m.agendado],
              }))}
              series={[
                { cor: COR_ATEND, rotulo: "Atendimentos" },
                { cor: COR_PLANOS, rotulo: "Planos VIP" },
                { cor: COR_AGENDADO, rotulo: "Agendado" },
              ]}
              formatar={reaisCurto}
              destaque={fin.meses.findIndex((m) => m.mes === mesAtual)}
            />
          </div>
        </Secao>
      )}

      {/* ===== ganhos dos planos ===== */}
      {g && planos && (
        <Secao
          titulo="Ganhos com os planos VIP"
          descricao={g.semTabela ? "Valores estimados — rode o SQL 009 para registrar cada mensalidade." : "Mensalidades registradas no painel"}
          acoes={
            <button className="btn btn-outline py-2! px-4! text-[0.8rem]!" onClick={() => irPara("planos")}>
              Ver planos →
            </button>
          }
        >
          <div className="ds-vip-grade">
            <div className="ds-vip-destaque">
              <span>Recebido em planos neste mês</span>
              <strong>
                <Numero valor={g.recebidoMes} formatar={reais} />
              </strong>
              <Variacao atual={g.recebidoMes} anterior={g.recebidoMesAnterior} />
              <div className="ds-vip-mini">
                <div>
                  <small>Total desde o início</small>
                  <b>
                    <Numero valor={g.recebidoTotal} formatar={reais} />
                  </b>
                </div>
                <div>
                  <small>Ticket por cliente</small>
                  <b>{reais(g.ticketMedio)}/mês</b>
                </div>
                <div>
                  <small>Permanência média</small>
                  <b>{g.permanenciaMedia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} meses</b>
                </div>
                <div>
                  <small>Em aberto</small>
                  <b className={g.emAbertoQtd ? "text-[#ffcb6b]" : ""}>
                    {g.emAbertoQtd ? `${reais(g.emAbertoValor)} (${g.emAbertoQtd})` : "nada 🎉"}
                  </b>
                </div>
              </div>
              <p className="ds-vip-nota">
                Neste mês as VIP fizeram {g.atendimentosVipMes} {g.atendimentosVipMes === 1 ? "atendimento" : "atendimentos"} que
                avulsos custariam {reais(g.valorAtendimentosVip)}
                {g.cancelados90 > 0 ? ` · ${g.cancelados90} cancelamento(s) em 90 dias` : ""}.
              </p>
            </div>

            <div className="ds-vip-lista">
              <h4>Renovam nos próximos 7 dias</h4>
              {g.renovam7.length === 0 ? (
                <p className="text-sm text-(--text-muted)">Nenhuma renovação esta semana.</p>
              ) : (
                <ul>
                  {g.renovam7.map((r, i) => (
                    <li key={r.id} style={{ "--d": `${i * 80}ms` } as CSSProperties}>
                      <span className="truncate">{r.nome}</span>
                      <small>{dataCurta(r.renovacao)}</small>
                      <b>{reais(r.valor)}</b>
                    </li>
                  ))}
                </ul>
              )}
              <h4 className="mt-5">Clientes VIP agora</h4>
              <ul className="ds-vip-clientes">
                {planos.resumos
                  .filter((r) => r.status === "ativo" && r.ciclo)
                  .sort((a, b) => a.ciclo!.diasRestantes - b.ciclo!.diasRestantes)
                  .slice(0, 6)
                  .map((r) => (
                    <li key={r.id}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{r.nome}</span>
                        <Bolinhas usadas={r.usadasCiclo} total={VIP_MANUTENCOES} />
                      </div>
                      <BarraCiclo progresso={r.ciclo!.progresso} alerta={r.ciclo!.diasRestantes <= 5} />
                      <small>
                        renova em {r.ciclo!.diasRestantes} {r.ciclo!.diasRestantes === 1 ? "dia" : "dias"}
                        {r.proxima ? ` · próxima sessão ${dataCurta(r.proxima.data)} ${r.proxima.horario}` : " · sem horário marcado"}
                      </small>
                    </li>
                  ))}
                {g.ativos === 0 && <li className="text-sm text-(--text-muted)">Nenhuma cliente VIP ativa ainda.</li>}
              </ul>
            </div>
          </div>
        </Secao>
      )}

      {/* ===== próximos atendimentos ===== */}
      <Secao
        titulo="Próximos atendimentos"
        descricao={`Atualiza sozinho a cada minuto${atualizado ? ` · última às ${atualizado.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}`}
        acoes={
          <button className="btn btn-outline py-2! px-4! text-[0.8rem]!" onClick={() => recarregar().then(() => setAtualizado(new Date()))}>
            Atualizar
          </button>
        }
      >
        {painel.proximos.length === 0 ? (
          <ListaVazia>Nenhum atendimento marcado daqui pra frente.</ListaVazia>
        ) : (
          <ul className="adm-lista ds-linha-tempo">
            {painel.proximos.map((a, i) => (
              <li key={a.id} className="adm-item" style={{ "--d": `${i * 60}ms` } as CSSProperties}>
                <div className="adm-item-hora">
                  <strong>{a.appointment_time.slice(0, 5)}</strong>
                  <span>{dataCurta(a.appointment_date)}</span>
                </div>
                <div className="adm-item-info">
                  <strong className="truncate">{a.client_name}</strong>
                  <span className="truncate">{a.servico_nome ?? "Serviço"}</span>
                </div>
                <div className="adm-item-acoes">
                  <Badge cor={a.appointment_date === fin?.hoje ? "rose" : "verde"}>{a.appointment_date === fin?.hoje ? "hoje" : "confirmado"}</Badge>
                  <a href={linkWhatsCliente(a.client_phone)} target="_blank" rel="noopener noreferrer" className="adm-whats" aria-label={`WhatsApp de ${a.client_name}`}>
                    <WhatsAppIcon size={18} />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <p className="text-xs text-(--text-muted)">
        Atendimentos concluídos no total: {painel.concluidos_total} · Clientes com conta: {painel.total_clientes}
      </p>
    </div>
  );
}

function MetaDoMes({ faturado, meta, mes, aoSalvar }: { faturado: number; meta: number | null; mes: string; aoSalvar: () => void }) {
  const acao = useAcao();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(meta ? String(meta) : "");
  const progresso = meta ? faturado / meta : 0;
  const falta = meta ? Math.max(0, meta - faturado) : 0;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const { adminSetConfiguracao } = await import("@/lib/acoes/configuracoes");
    const limpo = valor.replace(/[^\d,]/g, "").replace(",", ".");
    const r = await acao(() => adminSetConfiguracao("meta_mensal", limpo), "Meta salva!");
    if (r?.ok) {
      setEditando(false);
      aoSalvar();
    }
  }

  return (
    <div className="ds-meta">
      <Anel progresso={progresso}>
        {meta ? (
          <>
            <strong>{Math.round(progresso * 100)}%</strong>
            <small>da meta</small>
          </>
        ) : (
          <>
            <strong>—</strong>
            <small>sem meta</small>
          </>
        )}
      </Anel>
      <div className="ds-meta-texto">
        <span>Meta de {nomeMes(mes, false).split(" ")[0]}</span>
        {editando ? (
          <form onSubmit={salvar} className="flex gap-2 mt-1">
            <input
              className="input-lux py-1.5! px-3! w-28! md:text-sm!"
              inputMode="decimal"
              placeholder="5000"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              autoFocus
              aria-label="Meta do mês em reais"
            />
            <button className="btn btn-primary py-1.5! px-3! text-[0.78rem]!">Salvar</button>
          </form>
        ) : (
          <>
            <b>{meta ? dinheiro(meta) : "Defina uma meta"}</b>
            <small>{meta ? (falta > 0 ? `faltam ${dinheiro(Math.round(falta))}` : "meta batida! 🎉") : "para acompanhar o mês"}</small>
            <button type="button" className="ds-meta-editar" onClick={() => setEditando(true)}>
              {meta ? "alterar" : "definir meta"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
