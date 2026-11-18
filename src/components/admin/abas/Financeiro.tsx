"use client";

import type { Financeiro } from "@/lib/acoes/admin-relatorios";
import { BarrasEmpilhadas, BarrasHorizontais, Legenda } from "../graficos";
import { Numero, Variacao } from "../anima";
import { Carregando, ErroCarregar, ListaVazia, Secao, dinheiro, useDados } from "../ui";
import type { Aba } from "../navegacao";

const COR_RECEBIDO = "var(--viz-1)";
const COR_AGENDADO = "var(--viz-2)";
const COR_PLANOS = "var(--viz-3)";

function nomeMes(mes: string, curto = true): string {
  const [a, m] = mes.split("-").map(Number);
  return new Date(a, m - 1, 15).toLocaleDateString("pt-BR", curto ? { month: "short" } : { month: "long", year: "numeric" }).replace(".", "");
}

/** R$ 1,2 mil no eixo; valor cheio no resto */
function compacto(v: number): string {
  if (v >= 1000) return `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `R$ ${Math.round(v)}`;
}

export default function AbaFinanceiro({ irPara }: { irPara: (a: Aba) => void }) {
  const { dados, erro, recarregar } = useDados<Financeiro>(async () => {
    const { adminFinanceiro } = await import("@/lib/acoes/admin-relatorios");
    return adminFinanceiro();
  });

  if (erro) return <ErroCarregar aoTentar={recarregar} />;
  if (!dados) return <Carregando texto="Calculando o financeiro..." />;

  const mesAtual = dados.hoje.slice(0, 7);
  const idxAtual = dados.meses.findIndex((m) => m.mes === mesAtual);
  const vaiEntrar30 = dados.proximos30Agendado + dados.vipMensal;
  const semDados = dados.meses.every((m) => m.recebido === 0 && m.agendado === 0 && m.planos === 0) && dados.vipMensal === 0;

  return (
    <div className="space-y-8">
      <div className="fin-cards">
        <div className="fin-card destaque">
          <span>Entrou em {nomeMes(mesAtual, false)}</span>
          <strong>
            <Numero valor={dados.recebidoMes + dados.planosMes} formatar={(v) => dinheiro(Math.round(v))} />
          </strong>
          <small>
            {dinheiro(dados.recebidoMes)} em {dados.atendimentosMes} {dados.atendimentosMes === 1 ? "atendimento" : "atendimentos"} +{" "}
            {dinheiro(dados.planosMes)} de mensalidades VIP
          </small>
          <Variacao atual={dados.recebidoMes + dados.planosMes} anterior={dados.recebidoMesAnterior + dados.planosMesAnterior} />
        </div>
        <div className="fin-card">
          <span>Ainda vai entrar este mês</span>
          <strong>{dinheiro(dados.agendadoRestanteMes)}</strong>
          <small>horários confirmados até o fim do mês</small>
        </div>
        <div className="fin-card">
          <span>Vai entrar nos próximos 30 dias</span>
          <strong>{dinheiro(vaiEntrar30)}</strong>
          <small>
            {dinheiro(dados.proximos30Agendado)} em {dados.proximos30Qtd - dados.vipInclusos30} horários + {dinheiro(dados.vipMensal)} do VIP
          </small>
        </div>
        <div className="fin-card">
          <span>Planos VIP (por mês)</span>
          <strong>{dinheiro(dados.vipMensal)}</strong>
          <small>
            {dados.vipAtivos} {dados.vipAtivos === 1 ? "assinatura ativa" : "assinaturas ativas"}
          </small>
        </div>
      </div>

      {dados.paraFecharQtd > 0 && (
        <button type="button" className="fin-alerta" onClick={() => irPara("agendamentos")}>
          <strong>
            {dados.paraFecharQtd} {dados.paraFecharQtd === 1 ? "atendimento passado ainda não foi fechado" : "atendimentos passados ainda não foram fechados"}
          </strong>
          <span>
            {dinheiro(dados.paraFecharValor)} fica de fora do “entrou” até você marcar como concluído. Toque para abrir Agendamentos →
          </span>
        </button>
      )}

      <Secao
        titulo="Faturamento por mês"
        descricao="Atendimentos concluídos e mensalidades VIP já entraram. Agendado = horário confirmado que ainda não foi marcado como concluído."
      >
        {semDados ? (
          <ListaVazia>Ainda não há atendimentos com preço nos últimos meses.</ListaVazia>
        ) : (
          <div className="lux-card p-4 md:p-5">
            <Legenda
              itens={[
                { cor: COR_RECEBIDO, rotulo: "Atendimentos concluídos" },
                { cor: COR_PLANOS, rotulo: "Mensalidades VIP" },
                { cor: COR_AGENDADO, rotulo: "Agendado (vai entrar)" },
              ]}
            />
            <BarrasEmpilhadas
              dados={dados.meses.map((m) => ({
                rotulo: nomeMes(m.mes),
                dica: nomeMes(m.mes, false),
                valores: [m.recebido, m.planos, m.agendado],
              }))}
              series={[
                { cor: COR_RECEBIDO, rotulo: "Atendimentos" },
                { cor: COR_PLANOS, rotulo: "Planos VIP" },
                { cor: COR_AGENDADO, rotulo: "Agendado" },
              ]}
              formatar={compacto}
              destaque={idxAtual}
            />
            <details className="viz-tabela">
              <summary>Ver os números</summary>
              <table>
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Atendimentos</th>
                    <th>Planos VIP</th>
                    <th>Agendado</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.meses.map((m) => (
                    <tr key={m.mes}>
                      <td>{nomeMes(m.mes, false)}</td>
                      <td>{dinheiro(m.recebido)}</td>
                      <td>{dinheiro(m.planos)}</td>
                      <td>{dinheiro(m.agendado)}</td>
                      <td>{dinheiro(m.recebido + m.planos + m.agendado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
        )}
        <p className="text-xs text-(--text-muted) mt-3">
          Os atendimentos de clientes VIP contam como R$ 0, porque já estão pagos na mensalidade (que aparece em Planos VIP).
          {dados.semPreco > 0 && ` ${dados.semPreco} atendimento(s) sem preço no catálogo ficaram de fora.`}
        </p>
      </Secao>

      <div className="grid gap-8 lg:grid-cols-2">
        <Secao titulo="Serviços que mais faturaram" descricao="Concluídos nos últimos 90 dias">
          {dados.porServico.length === 0 ? (
            <ListaVazia>Nenhum atendimento concluído nos últimos 90 dias.</ListaVazia>
          ) : (
            <div className="lux-card p-4 md:p-5">
              <BarrasHorizontais
                cor={COR_RECEBIDO}
                formatar={dinheiro}
                itens={dados.porServico.map((s) => ({ rotulo: s.nome, valor: s.valor, extra: `${s.qtd}×` }))}
              />
            </div>
          )}
        </Secao>
        <Secao titulo="Ticket médio" descricao="Valor médio por atendimento concluído (90 dias)">
          <div className="lux-card p-5">
            <p className="font-heading text-4xl text-(--rose-gold)">{dinheiro(dados.ticketMedio90)}</p>
            <p className="text-xs text-(--text-muted) mt-2">Para o “entrou” ficar certo, marque cada atendimento como concluído em Agendamentos.</p>
          </div>
        </Secao>
      </div>
    </div>
  );
}
