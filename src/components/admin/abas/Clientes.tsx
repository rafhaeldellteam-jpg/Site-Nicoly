"use client";

import { useState } from "react";
import type { ClienteInfo } from "@/lib/types";
import { AdminAvatar } from "../shared";
import { Badge, BarraAba, Carregando, ErroCarregar, ListaVazia, useDados } from "../ui";

export default function AbaClientes() {
  const { dados, erro, recarregar } = useDados<ClienteInfo[]>(async () => {
    const { adminListClientes } = await import("@/lib/acoes/admin-clientes");
    return adminListClientes();
  });
  const [busca, setBusca] = useState("");

  if (erro) return <ErroCarregar aoTentar={recarregar} />;
  if (!dados) return <Carregando texto="Carregando clientes..." />;

  const termo = busca.trim().toLowerCase();
  const lista = [...dados]
    .sort((a, b) => (b.criado_em || "").localeCompare(a.criado_em || ""))
    .filter((c) => !termo || (c.nome ?? "").toLowerCase().includes(termo) || c.email.toLowerCase().includes(termo));

  return (
    <div className="space-y-6">
      <BarraAba resumo={`${dados.length} contas criadas no site`}>
        <input className="input-lux py-2! md:text-sm! sm:w-60!" placeholder="Buscar nome ou e-mail..." value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar cliente" />
      </BarraAba>

      {lista.length === 0 ? (
        <ListaVazia>
          {termo ? "Nenhuma cliente encontrada." : "As contas aparecem aqui quando alguém cria conta ou entra com o Google no site."}
        </ListaVazia>
      ) : (
        <ul className="adm-grade-cards">
          {lista.map((c) => (
            <li key={c.id} className="lux-card p-4 flex items-start gap-3">
              <AdminAvatar nome={c.nome ?? c.email} size={42} />
              <div className="min-w-0 flex-1">
                <strong className="block truncate">{c.nome ?? c.email.split("@")[0]}</strong>
                <a href={`mailto:${c.email}`} className="block text-sm text-(--text-muted) truncate hover:text-(--rose-gold)">
                  {c.email}
                </a>
                {c.telefone && <span className="block text-sm text-(--text-muted)">{c.telefone}</span>}
                <div className="flex gap-2 mt-2 flex-wrap items-center">
                  <Badge cor={c.provedor === "google" ? "azul" : "rose"}>{c.provedor}</Badge>
                  {c.criado_em && (
                    <span className="text-[11px] text-(--text-muted)">desde {new Date(c.criado_em).toLocaleDateString("pt-BR")}</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
