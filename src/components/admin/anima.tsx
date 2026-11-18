"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

/*
 * Peças animadas do painel: números que sobem contando, anel de meta,
 * barra do ciclo do plano, bolinhas das manutenções e setinha de variação.
 * Quem prefere menos movimento (configuração do celular) vê tudo parado.
 */

function semMovimento(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Sobe de 0 (ou do valor anterior) até `alvo` em `ms`. */
export function useContagem(alvo: number, ms = 1100): number {
  const [valor, setValor] = useState(0);
  const atual = useRef(0);
  useEffect(() => {
    const de = atual.current;
    if (semMovimento() || de === alvo) {
      atual.current = alvo;
      const id = requestAnimationFrame(() => setValor(alvo));
      return () => cancelAnimationFrame(id);
    }
    let id = 0;
    const t0 = performance.now();
    const passo = (t: number) => {
      const u = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - u, 3);
      atual.current = de + (alvo - de) * e;
      setValor(atual.current);
      if (u < 1) id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [alvo, ms]);
  return valor;
}

export function Numero({ valor, formatar = (v) => String(Math.round(v)) }: { valor: number; formatar?: (v: number) => string }) {
  const v = useContagem(valor);
  return <>{formatar(v)}</>;
}

/** Anel de progresso (0 a 1), com o conteúdo no meio. */
export function Anel({
  progresso,
  tamanho = 148,
  espessura = 12,
  children,
}: {
  progresso: number;
  tamanho?: number;
  espessura?: number;
  children?: ReactNode;
}) {
  const p = useContagem(Math.max(0, Math.min(1, progresso)) * 1000, 1400) / 1000;
  const r = (tamanho - espessura) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="anim-anel" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} aria-hidden="true">
        <defs>
          <linearGradient id="anel-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f0cbb0" />
            <stop offset="55%" stopColor="#d8a37d" />
            <stop offset="100%" stopColor="#b8825c" />
          </linearGradient>
        </defs>
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={espessura} />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={r}
          fill="none"
          stroke="url(#anel-grad)"
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
        />
      </svg>
      <div className="anim-anel-centro">{children}</div>
    </div>
  );
}

/** Barra horizontal que enche ao aparecer. */
export function BarraCiclo({ progresso, alerta = false }: { progresso: number; alerta?: boolean }) {
  const pct = Math.round(Math.max(0, Math.min(1, progresso)) * 100);
  return (
    <div className={`anim-barra ${alerta ? "alerta" : ""}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ "--p": `${pct}%` } as CSSProperties} />
    </div>
  );
}

/** Bolinhas das manutenções do ciclo (cheias = usadas). */
export function Bolinhas({ usadas, total }: { usadas: number; total: number }) {
  return (
    <span className="anim-bolinhas" aria-label={`${Math.min(usadas, total)} de ${total} manutenções usadas`}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < usadas ? "on" : ""} style={{ "--d": `${200 + i * 120}ms` } as CSSProperties} />
      ))}
    </span>
  );
}

/** ▲ 12% / ▼ 8% comparando com o período anterior. */
export function Variacao({ atual, anterior, rotulo = "vs mês passado" }: { atual: number; anterior: number; rotulo?: string }) {
  if (anterior <= 0 && atual <= 0) return null;
  if (anterior <= 0) return <span className="anim-var sobe">novo {rotulo.replace("vs ", "no ")}</span>;
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  const classe = pct > 0 ? "sobe" : pct < 0 ? "desce" : "";
  return (
    <span className={`anim-var ${classe}`} title={rotulo}>
      {pct > 0 ? "▲" : pct < 0 ? "▼" : "•"} {Math.abs(pct)}% <small>{rotulo}</small>
    </span>
  );
}

/** Linha suave com área (mini gráfico de tendência). */
export function Tendencia({ valores, altura = 46 }: { valores: number[]; altura?: number }) {
  const w = 160;
  const max = Math.max(...valores, 1);
  const pts = valores.map((v, i) => [(i / Math.max(valores.length - 1, 1)) * w, altura - 4 - (v / max) * (altura - 10)] as const);
  if (pts.length < 2) return null;
  const linha = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  return (
    <svg className="anim-tendencia" viewBox={`0 0 ${w} ${altura}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="tend-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(216,163,125,0.45)" />
          <stop offset="100%" stopColor="rgba(216,163,125,0)" />
        </linearGradient>
      </defs>
      <path d={`${linha}L${w},${altura}L0,${altura}Z`} fill="url(#tend-grad)" className="anim-tendencia-area" />
      <path d={linha} fill="none" stroke="#e7b791" strokeWidth="2" strokeLinejoin="round" pathLength={1} className="anim-tendencia-linha" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill="#f0cbb0" className="anim-tendencia-ponto" />
    </svg>
  );
}

/** Saudação conforme a hora. */
export function saudacao(d = new Date()): string {
  const h = d.getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}
