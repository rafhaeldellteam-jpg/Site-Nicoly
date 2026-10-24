"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import PlanosSignup from "@/components/PlanosSignup";
import { IconCheck, IconSparkle } from "@/components/icons";

type PlanoId = "avulso" | "vip";

const VIP_MENSAL = 180;
const VIP_MANUTENCOES = 3;
const VIP_DESIGNS = 2;

function reais(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: v % 1 ? 2 : 0 });
}

/** Valor de uma célula da comparação: texto, ou true/false para ✓ e — */
type Celula = string | boolean;

export default function PlanosEscolha({
  tecnicas,
  manutencaoMin,
  designPreco,
}: {
  tecnicas: string[];
  manutencaoMin: number | null;
  designPreco: number | null;
}) {
  const [plano, setPlano] = useState<PlanoId>("vip");
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const topoRef = useRef<HTMLDivElement>(null);

  // quanto custaria o mesmo pacote pagando avulso (só mostra se o catálogo tiver os preços)
  const avulsoEquivalente =
    manutencaoMin !== null && designPreco !== null ? VIP_MANUTENCOES * manutencaoMin + VIP_DESIGNS * designPreco : null;
  const economia = avulsoEquivalente !== null ? avulsoEquivalente - VIP_MENSAL : null;

  const PLANOS: Record<PlanoId, { nome: string; frase: string; preco: string; periodo: string; selo?: string }> = {
    avulso: {
      nome: "Avulso",
      frase: "Pague só quando vier",
      preco: manutencaoMin !== null ? `a partir de ${reais(manutencaoMin)}` : "por atendimento",
      periodo: "por manutenção",
    },
    vip: {
      nome: "VIP Mensal",
      frase: "Cílios impecáveis o mês todo",
      preco: reais(VIP_MENSAL),
      periodo: "por mês",
      selo: "Mais vantajoso",
    },
  };

  const LINHAS: { rotulo: string; avulso: Celula; vip: Celula }[] = [
    { rotulo: "Valor", avulso: PLANOS.avulso.preco + " cada", vip: `${reais(VIP_MENSAL)}/mês` },
    { rotulo: "Manutenções no mês", avulso: "Pagas à parte", vip: `${VIP_MANUTENCOES} inclusas` },
    {
      rotulo: "Design de sobrancelhas",
      avulso: designPreco !== null ? `${reais(designPreco)} cada` : "Pago à parte",
      vip: `${VIP_DESIGNS} inclusos`,
    },
    { rotulo: "Técnicas", avulso: "Qualquer do catálogo", vip: "Qualquer do catálogo" },
    { rotulo: "Prioridade na agenda", avulso: false, vip: true },
    { rotulo: "Horários garantidos", avulso: false, vip: true },
    ...(avulsoEquivalente !== null
      ? [{ rotulo: "Mesmo pacote no mês", avulso: `${reais(avulsoEquivalente)} ou mais`, vip: reais(VIP_MENSAL) }]
      : []),
  ];

  function continuar() {
    setEtapa(2);
    requestAnimationFrame(() => topoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <div ref={topoRef} className="planos-wrap scroll-mt-28">
      <p className="planos-etapa">
        Etapa <strong>{etapa}</strong> de 2 · {etapa === 1 ? "Escolha seu plano" : plano === "vip" ? "Seus dados" : "Agende seu horário"}
      </p>

      {etapa === 1 ? (
        <>
          {/* colunas dos planos (estilo Netflix) */}
          <div className="planos-colunas" role="radiogroup" aria-label="Planos">
            {(Object.keys(PLANOS) as PlanoId[]).map((id) => {
              const p = PLANOS[id];
              const sel = plano === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  className={`plano-cartao ${id} ${sel ? "sel" : ""}`}
                  onClick={() => setPlano(id)}
                >
                  {p.selo && (
                    <span className="plano-selo">
                      <IconSparkle size={10} /> {p.selo}
                    </span>
                  )}
                  <span className="plano-topo">
                    <strong>{p.nome}</strong>
                    <small>{p.frase}</small>
                  </span>
                  <span className="plano-preco">
                    <b>{p.preco}</b>
                    <small>{p.periodo}</small>
                  </span>
                  <span className="plano-check" aria-hidden="true">
                    {sel && <IconCheck size={14} />}
                  </span>
                </button>
              );
            })}
          </div>

          {economia !== null && economia > 0 && (
            <p className={`planos-economia ${plano === "vip" ? "on" : ""}`}>
              Com o VIP você economiza até <strong>{reais(economia)} por mês</strong> em relação ao avulso.
            </p>
          )}

          {/* comparação (estilo Disney+) */}
          <div className="planos-tabela" role="table" aria-label="Comparação dos planos">
            <div className="planos-linha cabecalho" role="row">
              <span role="columnheader" className="planos-rotulo">
                Compare
              </span>
              <span role="columnheader" className={plano === "avulso" ? "on" : ""}>
                Avulso
              </span>
              <span role="columnheader" className={plano === "vip" ? "on" : ""}>
                VIP
              </span>
            </div>
            {LINHAS.map((l) => (
              <div key={l.rotulo} className="planos-linha" role="row">
                <span role="rowheader" className="planos-rotulo">
                  {l.rotulo}
                </span>
                {(["avulso", "vip"] as PlanoId[]).map((id) => {
                  const v = l[id];
                  return (
                    <span key={id} role="cell" className={plano === id ? "on" : ""}>
                      {v === true ? (
                        <IconCheck size={18} className="text-[#7bd88f] inline-block" />
                      ) : v === false ? (
                        <span className="text-(--text-muted)" aria-label="Não incluso">
                          —
                        </span>
                      ) : (
                        v
                      )}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>

          <button type="button" className="btn btn-primary btn-block planos-continuar" onClick={continuar}>
            {plano === "vip" ? `Continuar com o VIP — ${reais(VIP_MENSAL)}/mês` : "Continuar com o avulso"}
          </button>

          <Perguntas />
        </>
      ) : (
        <div className="planos-etapa2">
          <button type="button" className="text-sm text-(--text-muted) hover:text-(--rose-gold) mb-4" onClick={() => setEtapa(1)}>
            ← Voltar e comparar os planos
          </button>

          <div className="plano-resumo">
            <div>
              <strong>{PLANOS[plano].nome}</strong>
              <small>{PLANOS[plano].frase}</small>
            </div>
            <span>
              {PLANOS[plano].preco}
              <small> {PLANOS[plano].periodo}</small>
            </span>
          </div>

          {plano === "vip" ? (
            <PlanosSignup tecnicas={tecnicas} />
          ) : (
            <div className="lux-card p-6 md:p-7 mt-6 text-center space-y-4">
              <p className="text-(--text-muted)">
                No avulso você paga cada atendimento separadamente. Escolha a técnica no catálogo e agende o melhor
                horário.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => window.dispatchEvent(new CustomEvent("abrir-agendamento"))}
                >
                  Agendar horário
                </button>
                <Link href="/catalogo" className="btn btn-outline">
                  Ver catálogo e preços
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Perguntas() {
  const itens: [string, string][] = [
    [
      "Como funciona o pagamento do VIP?",
      "Você faz o pedido aqui pelo site e a Nicoly chama no WhatsApp para combinar o pagamento. Assim que ele é confirmado, o plano é ativado e você recebe a confirmação por e-mail.",
    ],
    [
      "O que está incluso por mês?",
      `${VIP_MANUTENCOES} manutenções e ${VIP_DESIGNS} designs de sobrancelhas, com prioridade na agenda e horários garantidos.`,
    ],
    ["Posso escolher qualquer técnica?", "Sim. O plano vale para qualquer técnica do catálogo."],
    [
      "Quando o plano renova?",
      "A cada 30 dias, contando da data de início do plano.",
    ],
  ];
  return (
    <section className="planos-faq" aria-label="Perguntas frequentes">
      <h2 className="font-heading text-2xl mb-3">Perguntas frequentes</h2>
      {itens.map(([q, r]) => (
        <details key={q}>
          <summary>{q}</summary>
          <p>{r}</p>
        </details>
      ))}
    </section>
  );
}
