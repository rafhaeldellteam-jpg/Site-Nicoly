"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useModal } from "@/lib/use-modal";
import { IconCamera } from "@/components/icons";

/* ================= AVISOS (substituem os alert) ================= */

type Aviso = { id: number; tipo: "ok" | "erro"; texto: string };
const AvisoCtx = createContext<(tipo: Aviso["tipo"], texto: string) => void>(() => {});

export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const seq = useRef(0);

  const avisar = useCallback((tipo: Aviso["tipo"], texto: string) => {
    const id = ++seq.current;
    setAvisos((a) => [...a.slice(-2), { id, tipo, texto }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), tipo === "erro" ? 6000 : 3200);
  }, []);

  return (
    <AvisoCtx.Provider value={avisar}>
      {children}
      <div className="adm-avisos" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`adm-aviso ${a.tipo}`} role={a.tipo === "erro" ? "alert" : "status"}>
            {a.texto}
          </div>
        ))}
      </div>
    </AvisoCtx.Provider>
  );
}

/** avisar("ok", "Salvo!") ou avisar("erro", "Algo deu errado") */
export function useAvisos() {
  return useContext(AvisoCtx);
}

/**
 * Executa uma ação do painel mostrando aviso de sucesso/erro.
 * Erros de rede ou de permissão também viram aviso, em vez de travar a tela.
 */
export function useAcao() {
  const avisar = useAvisos();
  return useCallback(
    async <T extends { ok: boolean; erro?: string }>(
      fn: () => Promise<T>,
      msgOk?: string
    ): Promise<T | null> => {
      try {
        const r = await fn();
        if (r.ok) {
          if (msgOk) avisar("ok", msgOk);
        } else avisar("erro", r.erro ?? "Não foi possível concluir.");
        return r;
      } catch (e) {
        const msg = e instanceof Error && /autoriz/i.test(e.message)
          ? "Sua sessão expirou. Saia e entre de novo no painel."
          : "Sem conexão com o servidor. Tente de novo.";
        avisar("erro", msg);
        return null;
      }
    },
    [avisar]
  );
}

/* ================= CARREGAR DADOS ================= */

/** Carrega dados de uma ação do painel, com estado de carregando/erro e recarregar(). */
export function useDados<T>(carregarFn: () => Promise<T>) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState(false);
  const fnRef = useRef(carregarFn);
  useEffect(() => {
    fnRef.current = carregarFn;
  });

  const recarregar = useCallback(async () => {
    try {
      setErro(false);
      setDados(await fnRef.current());
    } catch {
      setErro(true);
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    fnRef
      .current()
      .then((d) => vivo && setDados(d))
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
    };
  }, []);

  return { dados, erro, recarregar };
}

/* ================= BLOCOS DE TELA ================= */

export function Carregando({ texto = "Carregando..." }: { texto?: string }) {
  return (
    <div className="space-y-3" aria-busy="true">
      <p className="text-(--text-muted) text-sm">{texto}</p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="adm-skeleton" />
      ))}
    </div>
  );
}

export function ErroCarregar({ aoTentar }: { aoTentar: () => void }) {
  return (
    <div className="lux-card p-6 text-center max-w-md">
      <p className="text-(--text-muted) mb-4">Não foi possível carregar. Verifique a conexão ou entre de novo.</p>
      <button className="btn btn-outline py-2! px-5! text-sm!" onClick={aoTentar}>
        Tentar de novo
      </button>
    </div>
  );
}

export function ListaVazia({ children }: { children: ReactNode }) {
  return <div className="adm-vazio">{children}</div>;
}

export function Secao({
  titulo,
  descricao,
  acoes,
  children,
  className = "",
}: {
  titulo?: string;
  descricao?: string;
  acoes?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`adm-secao ${className}`}>
      {(titulo || acoes) && (
        <header className="adm-secao-topo">
          <div className="min-w-0">
            {titulo && <h3 className="font-heading text-lg leading-tight">{titulo}</h3>}
            {descricao && <p className="text-xs text-(--text-muted) mt-0.5">{descricao}</p>}
          </div>
          {acoes && <div className="flex gap-2 flex-wrap">{acoes}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/** Barra do topo de cada aba: resumo à esquerda, botões à direita (empilha no celular). */
export function BarraAba({ resumo, children }: { resumo?: ReactNode; children?: ReactNode }) {
  return (
    <div className="adm-barra">
      <div className="text-(--text-muted) text-sm min-w-0">{resumo}</div>
      {children && <div className="adm-barra-acoes">{children}</div>}
    </div>
  );
}

export function Badge({ cor = "neutro", children }: { cor?: "verde" | "amarelo" | "vermelho" | "azul" | "neutro" | "rose"; children: ReactNode }) {
  return <span className={`adm-badge ${cor}`}>{children}</span>;
}

/* ================= FORMULÁRIO ================= */

export function Campo({
  rotulo,
  ajuda,
  obrigatorio,
  children,
  className = "",
}: {
  rotulo: string;
  ajuda?: string;
  obrigatorio?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`adm-campo ${className}`}>
      <span className="adm-rotulo">
        {rotulo}
        {obrigatorio && <em aria-hidden="true"> *</em>}
      </span>
      {children}
      {ajuda && <small className="adm-ajuda">{ajuda}</small>}
    </label>
  );
}

export function Interruptor({
  ligado,
  aoMudar,
  rotulo,
  descricao,
}: {
  ligado: boolean;
  aoMudar: (v: boolean) => void;
  rotulo: string;
  descricao?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      className="adm-switch"
      onClick={() => aoMudar(!ligado)}
    >
      <span className={`adm-switch-trilho ${ligado ? "on" : ""}`}>
        <span />
      </span>
      <span className="text-left">
        <span className="block text-sm text-(--text-main)">{rotulo}</span>
        {descricao && <span className="block text-xs text-(--text-muted)">{descricao}</span>}
      </span>
    </button>
  );
}

/**
 * Campo de imagem: escolher arquivo (com prévia) ou colar link.
 * O upload acontece só ao salvar — `arquivo` vai para o formulário pai.
 */
export function CampoImagem({
  url,
  arquivo,
  aoMudarUrl,
  aoMudarArquivo,
  rotulo = "Foto",
  formato = "quadrado",
}: {
  url: string;
  arquivo: File | null;
  aoMudarUrl: (v: string) => void;
  aoMudarArquivo: (f: File | null) => void;
  rotulo?: string;
  formato?: "quadrado" | "largo" | "redondo";
}) {
  const [previa, setPrevia] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!arquivo) {
      setPrevia(null);
      return;
    }
    const u = URL.createObjectURL(arquivo);
    setPrevia(u);
    return () => URL.revokeObjectURL(u);
  }, [arquivo]);

  const mostrar = previa ?? (url || null);

  return (
    <div className="adm-campo">
      <span className="adm-rotulo">{rotulo}</span>
      <div className="flex gap-3 items-start">
        <div className={`adm-imagem-previa ${formato}`}>
          {mostrar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mostrar} alt="" />
          ) : (
            <IconCamera size={22} />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <label className="btn btn-outline py-2! px-4! text-[0.82rem]! cursor-pointer w-full sm:w-auto">
            <IconCamera size={14} /> {arquivo ? "Trocar foto" : "Escolher foto"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                e.target.value = "";
                if (f && f.size > 8 * 1024 * 1024) {
                  setErro("Imagem maior que 8MB.");
                  return;
                }
                setErro("");
                aoMudarArquivo(f);
              }}
            />
          </label>
          {arquivo ? (
            <p className="text-xs text-(--text-muted) truncate">
              {arquivo.name} ·{" "}
              <button type="button" className="text-(--rose-gold) underline" onClick={() => aoMudarArquivo(null)}>
                remover
              </button>
            </p>
          ) : (
            <input
              className="input-lux py-2! md:text-sm!"
              placeholder="ou cole o link de uma imagem (https://...)"
              value={url}
              onChange={(e) => aoMudarUrl(e.target.value)}
            />
          )}
          {erro && <p className="text-xs text-[#ef5350]">{erro}</p>}
        </div>
      </div>
    </div>
  );
}

/* ================= GAVETA DE EDIÇÃO ================= */

/** Painel que desliza da direita (no celular ocupa a tela toda) para criar/editar itens. */
export function Gaveta({
  aberta,
  titulo,
  aoFechar,
  rodape,
  children,
}: {
  aberta: boolean;
  titulo: string;
  aoFechar: () => void;
  rodape?: ReactNode;
  children: ReactNode;
}) {
  useModal(aberta, aoFechar);
  if (!aberta) return null;
  return (
    <div className="adm-gaveta-fundo" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <aside className="adm-gaveta" role="dialog" aria-modal="true" aria-label={titulo}>
        <header className="adm-gaveta-topo">
          <h3 className="font-heading text-xl truncate">{titulo}</h3>
          <button type="button" onClick={aoFechar} className="adm-icone-btn" aria-label="Fechar">
            &times;
          </button>
        </header>
        <div className="adm-gaveta-corpo">{children}</div>
        {rodape && <footer className="adm-gaveta-rodape">{rodape}</footer>}
      </aside>
    </div>
  );
}

/* ================= UTILITÁRIOS ================= */

export function linkWhatsCliente(tel: string): string {
  const n = tel.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  return `https://wa.me/55${n}`;
}

export function dataCurta(iso: string, comAno = false): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    ...(comAno ? { year: "2-digit" as const } : {}),
  });
}

export function dataLonga(iso: string): string {
  return new Date(`${iso}T12:00:00`)
    .toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function dinheiro(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Data local (do aparelho) em YYYY-MM-DD. */
export function hojeLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
