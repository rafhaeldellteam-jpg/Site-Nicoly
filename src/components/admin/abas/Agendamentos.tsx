"use client";

import { useMemo, useState } from "react";
import type { Appointment } from "@/lib/types";
import { WhatsAppIcon } from "@/components/icons";
import {
  BarraAba,
  Carregando,
  ErroCarregar,
  ListaVazia,
  Secao,
  dataLonga,
  hojeLocal,
  linkWhatsCliente,
  useAcao,
  useAvisos,
  useDados,
} from "../ui";

type Ag = Appointment & { servico_nome: string | null };
type Filtro = "hoje" | "semana" | "todos";

export default function AbaAgendamentos() {
  const { dados, erro, recarregar } = useDados<Ag[]>(async () => {
    const { adminGetAppointments } = await import("@/lib/acoes/admin-agenda");
    return adminGetAppointments();
  });
  const acao = useAcao();
  const avisar = useAvisos();
  const [filtro, setFiltro] = useState<Filtro>("semana");
  const [busca, setBusca] = useState("");

  const hoje = hojeLocal();
  const em7 = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  if (erro) return <ErroCarregar aoTentar={recarregar} />;
  if (!dados) return <Carregando texto="Carregando agendamentos..." />;

  const termo = busca.trim().toLowerCase();
  const ativos = dados.filter((a) => !["concluido", "cancelado"].includes(a.status ?? ""));
  const paraFechar = ativos.filter((a) => a.appointment_date < hoje);
  const futuros = ativos
    .filter((a) => a.appointment_date >= hoje)
    .filter((a) => (filtro === "hoje" ? a.appointment_date === hoje : filtro === "semana" ? a.appointment_date <= em7 : true))
    .filter(
      (a) =>
        !termo ||
        a.client_name.toLowerCase().includes(termo) ||
        a.client_phone.replace(/\D/g, "").includes(termo.replace(/\D/g, "") || "§") ||
        (a.servico_nome ?? "").toLowerCase().includes(termo)
    );

  const porData = new Map<string, Ag[]>();
  for (const a of futuros) porData.set(a.appointment_date, [...(porData.get(a.appointment_date) ?? []), a]);

  async function enviarLembretes() {
    const { adminEnviarLembretesAgora } = await import("@/lib/acoes/admin-agenda");
    const r = await acao(async () => {
      const res = await adminEnviarLembretesAgora();
      return { ok: res.ok, erro: res.erro, msg: res.msg };
    });
    if (r?.ok && r.msg) avisar("ok", r.msg);
  }

  async function mudarStatus(a: Ag, status: string) {
    if (status === "cancelado" && !confirm(`Cancelar o horário de ${a.client_name}? O horário volta a ficar livre no site.`)) return;
    const { adminSetAppointmentStatus } = await import("@/lib/acoes/admin-agenda");
    const r = await acao(
      () => adminSetAppointmentStatus(a.id, status),
      status === "concluido" ? "Atendimento concluído." : status === "cancelado" ? "Horário cancelado e liberado." : "Status atualizado."
    );
    if (r?.ok) recarregar();
  }

  return (
    <div className="space-y-6">
      <div className="adm-lembrete">
        <p>
          <strong>Lembrete automático:</strong> todo dia às 9h as clientes com horário no dia seguinte recebem um e-mail, e
          você recebe o resumo da agenda de amanhã.
        </p>
        <button className="btn btn-outline py-2! px-4! text-[0.8rem]! shrink-0" onClick={enviarLembretes}>
          Enviar lembretes agora
        </button>
      </div>

      <BarraAba resumo={`${ativos.length - paraFechar.length} horários marcados daqui pra frente`}>
        <div className="adm-filtros" role="tablist">
          {(
            [
              ["hoje", "Hoje"],
              ["semana", "7 dias"],
              ["todos", "Todos"],
            ] as [Filtro, string][]
          ).map(([v, r]) => (
            <button key={v} role="tab" aria-selected={filtro === v} className={filtro === v ? "on" : ""} onClick={() => setFiltro(v)}>
              {r}
            </button>
          ))}
        </div>
        <input
          className="input-lux py-2! md:text-sm! sm:w-56!"
          placeholder="Buscar nome, telefone..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar agendamento"
        />
      </BarraAba>

      {paraFechar.length > 0 && (
        <Secao titulo="Para fechar" descricao="Atendimentos de dias anteriores que ainda estão como confirmados">
          <ul className="adm-lista">
            {paraFechar.map((a) => (
              <LinhaAgendamento key={a.id} a={a} aoMudar={mudarStatus} mostrarData />
            ))}
          </ul>
        </Secao>
      )}

      {porData.size === 0 ? (
        <ListaVazia>
          {termo ? "Nada encontrado com essa busca." : filtro === "hoje" ? "Nenhum horário marcado para hoje." : "Nenhum horário marcado neste período."}
        </ListaVazia>
      ) : (
        [...porData.entries()].map(([data, ags]) => (
          <Secao key={data} titulo={data === hoje ? `Hoje · ${dataLonga(data)}` : dataLonga(data)} descricao={`${ags.length} ${ags.length === 1 ? "horário" : "horários"}`}>
            <ul className="adm-lista">
              {ags.map((a) => (
                <LinhaAgendamento key={a.id} a={a} aoMudar={mudarStatus} />
              ))}
            </ul>
          </Secao>
        ))
      )}
    </div>
  );
}

function LinhaAgendamento({
  a,
  aoMudar,
  mostrarData,
}: {
  a: Ag;
  aoMudar: (a: Ag, status: string) => void;
  mostrarData?: boolean;
}) {
  return (
    <li className="adm-item">
      <div className="adm-item-hora">
        <strong>{a.appointment_time.slice(0, 5)}</strong>
        {mostrarData && <span>{new Date(`${a.appointment_date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>}
      </div>
      <div className="adm-item-info">
        <strong className="truncate">{a.client_name}</strong>
        <span className="truncate">
          {a.servico_nome ?? "Serviço"} · {a.client_phone}
        </span>
        {a.client_email && <span className="truncate text-xs">{a.client_email}</span>}
      </div>
      <div className="adm-item-acoes">
        <button className="btn btn-outline py-2! px-3! text-[0.78rem]!" onClick={() => aoMudar(a, "concluido")}>
          Concluir
        </button>
        <select
          className="input-lux w-auto! py-2! px-2! md:text-[0.8rem]!"
          value={a.status ?? "confirmado"}
          aria-label={`Status de ${a.client_name}`}
          onChange={(e) => aoMudar(a, e.target.value)}
        >
          <option value="confirmado">Confirmado</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelar</option>
        </select>
        <a href={linkWhatsCliente(a.client_phone)} target="_blank" rel="noopener noreferrer" className="adm-whats" aria-label={`WhatsApp de ${a.client_name}`}>
          <WhatsAppIcon size={18} />
        </a>
      </div>
    </li>
  );
}
