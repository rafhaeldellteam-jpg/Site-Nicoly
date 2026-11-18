"use client";

import { useState } from "react";
import type { Cliques } from "@/lib/acoes/admin-relatorios";
import { BarrasDiarias, BarrasHorizontais } from "../graficos";
import { BarraAba, Carregando, ErroCarregar, ListaVazia, Secao, useDados } from "../ui";

const COR = "var(--viz-1)";

/** De onde veio o clique (valor salvo pelo site → nome para a Nicoly) */
const ORIGENS: Record<string, string> = {
  home_hero: "Topo da página inicial",
  home_contato: "Contato da página inicial",
  catalogo: "Catálogo",
  pos_agendamento: "Depois de agendar",
  menu_mobile: "Menu do celular",
  barra_mobile: "Barra fixa do celular",
  planos: "Página de planos",
  novidades: "Janela de novidades",
  meus_horarios: "Meus horários",
};

function diaCurto(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export default function AbaCliques() {
  const [periodo, setPeriodo] = useState(30);
  return <Conteudo key={periodo} periodo={periodo} aoMudarPeriodo={setPeriodo} />;
}

function Conteudo({ periodo, aoMudarPeriodo }: { periodo: number; aoMudarPeriodo: (p: number) => void }) {
  const { dados, erro, recarregar } = useDados<Cliques>(async () => {
    const { adminCliquesWhatsapp } = await import("@/lib/acoes/admin-relatorios");
    return adminCliquesWhatsapp(periodo);
  });

  const filtro = (
    <div className="adm-filtros" role="tablist" aria-label="Período">
      {[7, 30, 90].map((p) => (
        <button key={p} role="tab" aria-selected={periodo === p} className={periodo === p ? "on" : ""} onClick={() => aoMudarPeriodo(p)}>
          {p} dias
        </button>
      ))}
    </div>
  );

  if (erro) return <ErroCarregar aoTentar={recarregar} />;
  if (!dados) return <Carregando texto="Carregando cliques..." />;
  if (dados.semTabela)
    return <ListaVazia>A tabela de cliques ainda não existe no banco. Rode o SQL 004 (cliques_whatsapp) no Supabase.</ListaVazia>;

  const variacao = dados.totalAnterior > 0 ? Math.round(((dados.total - dados.totalAnterior) / dados.totalAnterior) * 100) : null;
  const melhorDia = dados.dias.reduce((m, d) => (d.total > m.total ? d : m), { data: "", total: 0 });
  const principal = dados.porOrigem[0];

  return (
    <div className="space-y-8">
      <BarraAba
        resumo={
          <>
            <strong className="text-(--text-main) text-lg">{dados.total}</strong> cliques no WhatsApp em {periodo} dias
            {variacao !== null && (
              <span className={variacao >= 0 ? "text-[#7bd88f]" : "text-[#ff9a9a]"}>
                {" "}
                ({variacao >= 0 ? "+" : ""}
                {variacao}% vs. {periodo} dias anteriores)
              </span>
            )}
          </>
        }
      >
        {filtro}
      </BarraAba>

      {dados.total === 0 ? (
        <ListaVazia>Nenhum clique no WhatsApp registrado neste período.</ListaVazia>
      ) : (
        <>
          <Secao
            titulo="Cliques por dia"
            descricao={melhorDia.total > 0 ? `Dia com mais cliques: ${diaCurto(melhorDia.data)} (${melhorDia.total})` : undefined}
          >
            <div className="lux-card p-4 md:p-5">
              <BarrasDiarias dados={dados.dias} cor={COR} formatarDia={diaCurto} />
            </div>
          </Secao>

          <div className="grid gap-8 lg:grid-cols-2">
            <Secao
              titulo="De onde vieram"
              descricao={principal ? `${ORIGENS[principal.origem] ?? principal.origem} traz ${Math.round((principal.total / dados.total) * 100)}% dos cliques` : undefined}
            >
              <div className="lux-card p-4 md:p-5">
                <BarrasHorizontais cor={COR} itens={dados.porOrigem.map((o) => ({ rotulo: ORIGENS[o.origem] ?? o.origem, valor: o.total }))} />
              </div>
            </Secao>
            <Secao titulo="Campanhas" descricao="Links com ?utm=nome (ex.: nicbeautty.vercel.app/?utm=instagram)">
              <div className="lux-card p-4 md:p-5">
                <BarrasHorizontais
                  cor={COR}
                  itens={dados.porCampanha.map((c) => ({ rotulo: c.campanha === "direto" ? "Sem campanha (acesso direto)" : c.campanha, valor: c.total }))}
                />
              </div>
            </Secao>
          </div>
        </>
      )}
    </div>
  );
}
