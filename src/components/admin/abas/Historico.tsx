"use client";

import { useState } from "react";
import type { Appointment } from "@/lib/types";
import { WhatsAppIcon } from "@/components/icons";
import { Badge, BarraAba, Carregando, ErroCarregar, ListaVazia, dataCurta, linkWhatsCliente, useDados } from "../ui";

type Ag = Appointment & { servico_nome: string | null };

export default function AbaHistorico() {
  const { dados, erro, recarregar } = useDados<Ag[]>(async () => {
    const { adminGetHistorico } = await import("@/lib/actions");
    return adminGetHistorico();
  });
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");

  if (erro) return <ErroCarregar aoTentar={recarregar} />;
  if (!dados) return <Carregando texto="Carregando histórico..." />;

  const termo = busca.trim().toLowerCase();
  const filtrados = dados
    .filter((a) => (filtro === "todos" ? true : filtro === "sem" ? !a.status || a.status === "confirmado" : a.status === filtro))
    .filter((a) => !termo || a.client_name.toLowerCase().includes(termo) || (a.servico_nome ?? "").toLowerCase().includes(termo));

  const concluidos = dados.filter((a) => a.status === "concluido").length;
  const cancelados = dados.filter((a) => a.status === "cancelado").length;

  return (
    <div className="space-y-6">
      <BarraAba resumo={`${concluidos} concluídos · ${cancelados} cancelados (últimos 300)`}>
        <select className="input-lux w-auto! py-2! md:text-sm!" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar">
          <option value="todos">Todos ({dados.length})</option>
          <option value="concluido">Concluídos</option>
          <option value="cancelado">Cancelados</option>
          <option value="sem">Sem fechamento</option>
        </select>
        <input className="input-lux py-2! md:text-sm! sm:w-52!" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar no histórico" />
      </BarraAba>

      {filtrados.length === 0 ? (
        <ListaVazia>Nada no histórico com esse filtro.</ListaVazia>
      ) : (
        <ul className="adm-lista">
          {filtrados.map((a) => (
            <li key={a.id} className="adm-item opacity-95">
              <div className="adm-item-hora">
                <strong>{a.appointment_time.slice(0, 5)}</strong>
                <span>{dataCurta(a.appointment_date, true)}</span>
              </div>
              <div className="adm-item-info">
                <strong className="truncate">{a.client_name}</strong>
                <span className="truncate">
                  {a.servico_nome ?? "Serviço"} · {a.client_phone}
                </span>
              </div>
              <div className="adm-item-acoes">
                <Badge cor={a.status === "cancelado" ? "vermelho" : a.status === "concluido" ? "verde" : "neutro"}>
                  {a.status === "concluido" ? "concluído" : a.status ?? "antigo"}
                </Badge>
                <a href={linkWhatsCliente(a.client_phone)} target="_blank" rel="noopener noreferrer" className="adm-whats" aria-label={`WhatsApp de ${a.client_name}`}>
                  <WhatsAppIcon size={18} />
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
