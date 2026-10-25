"use client";

import { useState } from "react";
import { HORARIOS } from "@/lib/agenda";
import { Campo, Carregando, ErroCarregar, ListaVazia, Secao, dataLonga, hojeLocal, useAcao, useDados } from "../ui";

type Bloqueio = { id: string; block_date: string; block_time: string | null; reason: string | null };
type Tipo = "horario" | "dia" | "periodo";

export default function AbaBloqueios() {
  const { dados, erro, recarregar } = useDados<Bloqueio[]>(async () => {
    const { adminGetBlockedSlots } = await import("@/lib/acoes/admin-agenda");
    return adminGetBlockedSlots();
  });
  const acao = useAcao();
  const [tipo, setTipo] = useState<Tipo>("dia");
  const [data, setData] = useState(hojeLocal());
  const [ate, setAte] = useState("");
  const [horario, setHorario] = useState<string>(HORARIOS[0]);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function bloquear() {
    setSalvando(true);
    const { adminAddBlockedSlot } = await import("@/lib/acoes/admin-agenda");
    const r = await acao(() =>
      adminAddBlockedSlot(
        data,
        tipo === "horario" ? horario : null,
        motivo,
        tipo === "periodo" ? ate : null
      )
    );
    setSalvando(false);
    if (r?.ok) {
      setMotivo("");
      recarregar();
    }
  }

  async function liberar(b: Bloqueio) {
    const { adminRemoveBlockedSlot } = await import("@/lib/acoes/admin-agenda");
    const r = await acao(() => adminRemoveBlockedSlot(b.id), "Liberado na agenda.");
    if (r?.ok) recarregar();
  }

  const porData = new Map<string, Bloqueio[]>();
  for (const b of dados ?? []) porData.set(b.block_date, [...(porData.get(b.block_date) ?? []), b]);

  return (
    <div className="space-y-8 max-w-3xl">
      <Secao titulo="Fechar a agenda" descricao="Os horários fechados aparecem em cinza para as clientes.">
        <div className="adm-filtros mb-4" role="tablist">
          {(
            [
              ["dia", "Dia inteiro"],
              ["horario", "Um horário"],
              ["periodo", "Período (férias)"],
            ] as [Tipo, string][]
          ).map(([v, r]) => (
            <button key={v} role="tab" aria-selected={tipo === v} className={tipo === v ? "on" : ""} onClick={() => setTipo(v)}>
              {r}
            </button>
          ))}
        </div>

        <div className="adm-grade-form">
          <Campo rotulo={tipo === "periodo" ? "De" : "Data"} obrigatorio>
            <input type="date" className="input-lux" min={hojeLocal()} value={data} onChange={(e) => setData(e.target.value)} />
          </Campo>
          {tipo === "periodo" && (
            <Campo rotulo="Até" obrigatorio>
              <input type="date" className="input-lux" min={data} value={ate} onChange={(e) => setAte(e.target.value)} />
            </Campo>
          )}
          {tipo === "horario" && (
            <Campo rotulo="Horário" obrigatorio>
              <select className="input-lux" value={horario} onChange={(e) => setHorario(e.target.value)}>
                {HORARIOS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </Campo>
          )}
          <Campo rotulo="Motivo" ajuda="Aparece para as clientes quando o dia todo estiver fechado." className="sm:col-span-2">
            <input className="input-lux" placeholder="Ex.: Curso, feriado, férias" maxLength={120} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </Campo>
        </div>
        <button
          onClick={bloquear}
          disabled={salvando || !data || (tipo === "periodo" && !ate)}
          className="btn btn-primary w-full sm:w-auto mt-2 py-3! px-6!"
        >
          {salvando ? "Salvando..." : tipo === "periodo" ? "Fechar período" : "Fechar agenda"}
        </button>
      </Secao>

      <Secao titulo="Fechamentos programados">
        {erro ? (
          <ErroCarregar aoTentar={recarregar} />
        ) : !dados ? (
          <Carregando />
        ) : dados.length === 0 ? (
          <ListaVazia>Nenhum dia ou horário fechado daqui pra frente.</ListaVazia>
        ) : (
          <ul className="adm-lista">
            {[...porData.entries()].map(([d, lista]) =>
              lista.map((b) => (
                <li key={b.id} className="adm-item">
                  <div className="adm-item-info">
                    <strong>{dataLonga(d)}</strong>
                    <span>
                      {b.block_time ? `Às ${b.block_time.slice(0, 5)}` : "Dia inteiro"}
                      {b.reason ? ` · ${b.reason}` : ""}
                    </span>
                  </div>
                  <div className="adm-item-acoes">
                    <button onClick={() => liberar(b)} className="btn btn-outline py-2! px-4! text-[0.8rem]!">
                      Liberar
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </Secao>
    </div>
  );
}
