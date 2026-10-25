"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/*
 * Gráficos simples do painel, desenhados em SVG.
 * Cores validadas para daltonismo e contraste no fundo escuro do painel:
 *   --viz-1 (#c27a45, rose gold)  e  --viz-2 (#3987e5, azul).
 * Barras finas com cantos de 4px na ponta, grade discreta, tooltip ao
 * passar o mouse/tocar e tabela com os números logo abaixo.
 */

function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(Math.floor(e.contentRect.width)));
    ro.observe(el);
    setLargura(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return { ref, largura };
}

/** Escala "redonda" para o eixo: 0, 250, 500, 750... */
function escala(max: number, passos = 4): { topo: number; ticks: number[] } {
  if (max <= 0) return { topo: 1, ticks: [0] };
  const bruto = max / passos;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((p) => p >= bruto) ?? 10 * mag;
  const topo = Math.ceil(max / passo) * passo;
  return { topo, ticks: Array.from({ length: Math.round(topo / passo) + 1 }, (_, i) => i * passo) };
}

/** Retângulo com só os cantos de cima arredondados (ponta da barra). */
function barra(x: number, y: number, w: number, h: number, r = 4): string {
  if (h <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

function Tooltip({ x, y, largura, children }: { x: number; y: number; largura: number; children: ReactNode }) {
  const esquerda = Math.max(8, Math.min(x, largura - 8));
  return (
    <div className="viz-tooltip" style={{ left: esquerda, top: y }} role="status">
      {children}
    </div>
  );
}

export function Legenda({ itens }: { itens: { cor: string; rotulo: string }[] }) {
  return (
    <ul className="viz-legenda">
      {itens.map((i) => (
        <li key={i.rotulo}>
          <i style={{ background: i.cor }} aria-hidden="true" />
          {i.rotulo}
        </li>
      ))}
    </ul>
  );
}

/* ================= BARRAS EMPILHADAS POR MÊS ================= */

export function BarrasEmpilhadas({
  dados,
  series,
  formatar,
  destaque,
  alturaPx = 220,
}: {
  dados: { rotulo: string; dica: string; valores: number[] }[];
  series: { cor: string; rotulo: string }[];
  formatar: (v: number) => string;
  /** índice da barra em destaque (mês atual) */
  destaque?: number;
  alturaPx?: number;
}) {
  const { ref, largura } = useLargura<HTMLDivElement>();
  const [ativo, setAtivo] = useState<number | null>(null);
  const margem = { t: 12, r: 8, b: 26, l: 56 };
  const W = Math.max(largura, 260);
  const H = alturaPx;
  const iw = W - margem.l - margem.r;
  const ih = H - margem.t - margem.b;
  const totais = dados.map((d) => d.valores.reduce((a, b) => a + b, 0));
  const { topo, ticks } = escala(Math.max(...totais, 0));
  const banda = iw / Math.max(dados.length, 1);
  const bw = Math.min(40, banda * 0.56);
  const y = (v: number) => margem.t + ih - (v / topo) * ih;

  return (
    <div ref={ref} className="viz-caixa" onMouseLeave={() => setAtivo(null)}>
      {largura > 0 && (
        <svg width={W} height={H} role="img" aria-label="Gráfico de barras por mês">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={margem.l} x2={W - margem.r} y1={y(t)} y2={y(t)} className={t === 0 ? "viz-base" : "viz-grade"} />
              <text x={margem.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="viz-eixo">
                {formatar(t)}
              </text>
            </g>
          ))}
          {dados.map((d, i) => {
            const cx = margem.l + banda * i + banda / 2;
            let acumulado = 0;
            const partes = d.valores.map((v, s) => {
              const y0 = y(acumulado);
              acumulado += v;
              const y1 = y(acumulado);
              const ultimo = d.valores.slice(s + 1).every((n) => n <= 0);
              const h = y0 - y1 - (ultimo ? 0 : 2); // 2px de respiro entre as partes
              return h > 0 ? (
                <path
                  key={s}
                  d={ultimo ? barra(cx - bw / 2, y1, bw, h) : `M${cx - bw / 2},${y1 + 2}h${bw}v${h}h${-bw}Z`}
                  fill={series[s].cor}
                  opacity={ativo === null || ativo === i ? 1 : 0.45}
                />
              ) : null;
            });
            return (
              <g key={d.rotulo}>
                {partes}
                <text
                  x={cx}
                  y={H - 8}
                  textAnchor="middle"
                  className={`viz-eixo ${destaque === i ? "viz-eixo-forte" : ""}`}
                >
                  {d.rotulo}
                </text>
                {/* área de toque maior que a barra */}
                <rect
                  x={margem.l + banda * i}
                  y={margem.t}
                  width={banda}
                  height={ih}
                  fill="transparent"
                  onMouseEnter={() => setAtivo(i)}
                  onClick={() => setAtivo(ativo === i ? null : i)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {ativo !== null && dados[ativo] && (
        <Tooltip x={margem.l + banda * ativo + banda / 2} y={Math.max(0, y(totais[ativo]) - 8)} largura={W}>
          <strong>{dados[ativo].dica}</strong>
          {series.map((s, k) => (
            <span key={s.rotulo}>
              <i style={{ background: s.cor }} /> {s.rotulo}: {formatar(dados[ativo].valores[k])}
            </span>
          ))}
          <span className="viz-tooltip-total">Total: {formatar(totais[ativo])}</span>
        </Tooltip>
      )}
    </div>
  );
}

/* ================= BARRAS DIÁRIAS (uma série) ================= */

export function BarrasDiarias({
  dados,
  cor,
  formatarDia,
  alturaPx = 170,
}: {
  dados: { data: string; total: number }[];
  cor: string;
  formatarDia: (iso: string) => string;
  alturaPx?: number;
}) {
  const { ref, largura } = useLargura<HTMLDivElement>();
  const [ativo, setAtivo] = useState<number | null>(null);
  const margem = { t: 10, r: 6, b: 24, l: 30 };
  const W = Math.max(largura, 260);
  const H = alturaPx;
  const iw = W - margem.l - margem.r;
  const ih = H - margem.t - margem.b;
  const { topo, ticks } = escala(Math.max(...dados.map((d) => d.total), 0), 3);
  const banda = iw / Math.max(dados.length, 1);
  const bw = Math.max(2, Math.min(14, banda - 2));
  const y = (v: number) => margem.t + ih - (v / topo) * ih;
  // rótulos do eixo só a cada N dias para não encavalar
  const cada = Math.ceil(dados.length / Math.max(3, Math.floor(iw / 56)));

  return (
    <div ref={ref} className="viz-caixa" onMouseLeave={() => setAtivo(null)}>
      {largura > 0 && (
        <svg width={W} height={H} role="img" aria-label="Cliques por dia">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={margem.l} x2={W - margem.r} y1={y(t)} y2={y(t)} className={t === 0 ? "viz-base" : "viz-grade"} />
              <text x={margem.l - 6} y={y(t)} dy="0.32em" textAnchor="end" className="viz-eixo">
                {t}
              </text>
            </g>
          ))}
          {dados.map((d, i) => {
            const x = margem.l + banda * i + (banda - bw) / 2;
            return (
              <g key={d.data}>
                <path d={barra(x, y(d.total), bw, y(0) - y(d.total), 3)} fill={cor} opacity={ativo === null || ativo === i ? 1 : 0.45} />
                {(i % cada === 0 || i === dados.length - 1) && (
                  <text x={x + bw / 2} y={H - 7} textAnchor="middle" className="viz-eixo">
                    {formatarDia(d.data)}
                  </text>
                )}
                <rect
                  x={margem.l + banda * i}
                  y={margem.t}
                  width={banda}
                  height={ih}
                  fill="transparent"
                  onMouseEnter={() => setAtivo(i)}
                  onClick={() => setAtivo(ativo === i ? null : i)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {ativo !== null && dados[ativo] && (
        <Tooltip x={margem.l + banda * ativo + banda / 2} y={Math.max(0, y(dados[ativo].total) - 8)} largura={W}>
          <strong>{formatarDia(dados[ativo].data)}</strong>
          <span>
            {dados[ativo].total} {dados[ativo].total === 1 ? "clique" : "cliques"}
          </span>
        </Tooltip>
      )}
    </div>
  );
}

/* ================= BARRAS HORIZONTAIS (ranking) ================= */

export function BarrasHorizontais({
  itens,
  cor,
  formatar = (v) => String(v),
}: {
  itens: { rotulo: string; valor: number; extra?: string }[];
  cor: string;
  formatar?: (v: number) => string;
}) {
  const max = Math.max(...itens.map((i) => i.valor), 1);
  return (
    <ul className="viz-ranking">
      {itens.map((i) => (
        <li key={i.rotulo}>
          <div className="viz-ranking-topo">
            <span className="truncate">{i.rotulo}</span>
            <strong>
              {formatar(i.valor)}
              {i.extra && <small> · {i.extra}</small>}
            </strong>
          </div>
          <div className="viz-ranking-trilho">
            <span style={{ width: `${Math.max(2, (i.valor / max) * 100)}%`, background: cor }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
