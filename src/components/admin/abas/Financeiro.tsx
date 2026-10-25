"use client";

import type { Financeiro } from "@/lib/acoes/admin-relatorios";
import { BarrasEmpilhadas, BarrasHorizontais, Legenda } from "../graficos";
import { Carregando, ErroCarregar, ListaVazia, Secao, dinheiro, useDados } from "../ui";
import type { Aba } from "../navegacao";

const COR_RECEBIDO = "var(--viz-1)";
const COR_AGENDADO = "var(--viz-2)";

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
  const semDados = dados.meses.every((m) => m.recebido === 0 && m.agendado === 0) && dados.vipMensal === 0;

  return (
    <div className="space-y-8">
      <div className="fin-cards">
        <div className="fin-card destaque">
          <span>Entrou em {nomeMes(mesAtual, false)}</span>
          <strong>{dinheiro(dados.recebidoMes)}</strong>
          <small>
            {dados.atendimentosMes} {dados.atendimentosMes === 1 ? "atendimento concluído" : "atendimentos concluídos"}
          </small>
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
        titulo="Atendimentos por mês"
        descricao="Concluído = já entrou. Agendado = horário confirmado que ainda não foi marcado como concluído."
      >
        {semDados ? (
          <ListaVazia>Ainda não há atendimentos com preço nos últimos meses.</ListaVazia>
        ) : (
          <div className="lux-card p-4 md:p-5">
            <Legenda
              itens={[
                { cor: COR_RECEBIDO, rotulo: "Concluído (entrou)" },
                { cor: COR_AGENDADO, rotulo: "Agendado (vai entrar)" },
              ]}
            />
            <BarrasEmpilhadas
              dados={dados.meses.map((m) => ({
                rotulo: nomeMes(m.mes),
                dica: nomeMes(m.mes, false),
                valores: [m.recebido, m.agendado],
              }))}
              series={[
                { cor: COR_RECEBIDO, rotulo: "Concluído" },
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
                    <th>Concluído</th>
                    <th>Agendado</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.meses.map((m) => (
                    <tr key={m.mes}>
                      <td>{nomeMes(m.mes, false)}</td>
                      <td>{dinheiro(m.recebido)}</td>
                      <td>{dinheiro(m.agendado)}</td>
                      <td>{dinheiro(m.recebido + m.agendado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
        )}
        <p className="text-xs text-(--text-muted) mt-3">
          Sem contar a mensalidade do VIP; os atendimentos de clientes VIP aparecem como R$ 0, porque já estão pagos no plano.
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
