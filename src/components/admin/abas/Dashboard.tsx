"use client";

import { useEffect, useState } from "react";
import type { DashboardData } from "@/lib/types";
import { WhatsAppIcon } from "@/components/icons";
import { Badge, Carregando, ErroCarregar, ListaVazia, Secao, dataCurta, linkWhatsCliente, useDados } from "../ui";
import type { Aba } from "../navegacao";

export default function AbaDashboard({ irPara }: { irPara: (a: Aba) => void }) {
  const { dados, erro, recarregar } = useDados<DashboardData>(async () => {
    const { adminDashboard } = await import("@/lib/actions");
    return adminDashboard();
  });
  const [atualizado, setAtualizado] = useState<Date | null>(null);

  // atualiza sozinho a cada 60s enquanto a aba estiver aberta e visível
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") recarregar().then(() => setAtualizado(new Date()));
    }, 60000);
    return () => clearInterval(t);
  }, [recarregar]);

  if (erro) return <ErroCarregar aoTentar={recarregar} />;
  if (!dados) return <Carregando texto="Carregando indicadores..." />;

  const cards: { rotulo: string; valor: number; aba?: Aba; alerta?: boolean }[] = [
    { rotulo: "Agendados hoje", valor: dados.agendados_hoje, aba: "agendamentos" },
    { rotulo: "Próximos 7 dias", valor: dados.proximos_7_dias, aba: "agendamentos" },
    { rotulo: "Avaliações para aprovar", valor: dados.avaliacoes_pendentes, aba: "avaliacoes", alerta: dados.avaliacoes_pendentes > 0 },
    { rotulo: "Planos VIP pendentes", valor: dados.planos_pendentes, aba: "planos", alerta: dados.planos_pendentes > 0 },
    { rotulo: "Planos VIP ativos", valor: dados.assinaturas_ativas, aba: "planos" },
    { rotulo: "Clientes com conta", valor: dados.total_clientes, aba: "clientes" },
  ];

  return (
    <div className="space-y-8">
      <div className="adm-cards">
        {cards.map((c) => (
          <button
            key={c.rotulo}
            type="button"
            onClick={() => c.aba && irPara(c.aba)}
            className={`adm-card-num ${c.alerta ? "alerta" : ""}`}
          >
            <strong>{c.valor}</strong>
            <span>{c.rotulo}</span>
          </button>
        ))}
      </div>

      <Secao
        titulo="Próximos atendimentos"
        descricao={`Atualiza sozinho a cada minuto${atualizado ? ` · última às ${atualizado.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}`}
        acoes={
          <button className="btn btn-outline py-2! px-4! text-[0.8rem]!" onClick={() => recarregar().then(() => setAtualizado(new Date()))}>
            Atualizar
          </button>
        }
      >
        {dados.proximos.length === 0 ? (
          <ListaVazia>Nenhum atendimento marcado daqui pra frente.</ListaVazia>
        ) : (
          <ul className="adm-lista">
            {dados.proximos.map((a) => (
              <li key={a.id} className="adm-item">
                <div className="adm-item-hora">
                  <strong>{a.appointment_time.slice(0, 5)}</strong>
                  <span>{dataCurta(a.appointment_date)}</span>
                </div>
                <div className="adm-item-info">
                  <strong className="truncate">{a.client_name}</strong>
                  <span className="truncate">{a.servico_nome ?? "Serviço"}</span>
                </div>
                <div className="adm-item-acoes">
                  <Badge cor="verde">confirmado</Badge>
                  <a href={linkWhatsCliente(a.client_phone)} target="_blank" rel="noopener noreferrer" className="adm-whats" aria-label={`WhatsApp de ${a.client_name}`}>
                    <WhatsAppIcon size={18} />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <p className="text-xs text-(--text-muted)">Atendimentos concluídos no total: {dados.concluidos_total}</p>
    </div>
  );
}
