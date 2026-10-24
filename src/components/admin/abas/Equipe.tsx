"use client";

import { useState } from "react";
import type { Funcionario } from "@/lib/types";
import { AdminAvatar } from "../shared";
import { Badge, BarraAba, Campo, CampoImagem, Carregando, ErroCarregar, Gaveta, Interruptor, ListaVazia, useAcao, useDados } from "../ui";

export default function AbaEquipe() {
  const { dados, erro, recarregar } = useDados<Funcionario[]>(async () => {
    const { adminGetFuncionarios } = await import("@/lib/actions");
    return adminGetFuncionarios();
  });
  const [editando, setEditando] = useState<Partial<Funcionario> | null>(null);

  if (erro) return <ErroCarregar aoTentar={recarregar} />;
  if (!dados) return <Carregando texto="Carregando equipe..." />;

  return (
    <div className="space-y-6">
      <BarraAba resumo={`${dados.filter((f) => f.ativo !== false).length} profissionais aparecendo no site`}>
        <button className="btn btn-primary py-2.5! px-5! text-[0.88rem]!" onClick={() => setEditando({ ativo: true, ordem: dados.length + 1 })}>
          + Nova profissional
        </button>
      </BarraAba>

      {dados.length === 0 ? (
        <ListaVazia>Nenhuma profissional cadastrada. Elas aparecem na seção “Nossa equipe” da página inicial.</ListaVazia>
      ) : (
        <ul className="adm-grade-cards">
          {dados.map((f) => (
            <li key={f.id}>
              <button type="button" className="lux-card w-full p-4 flex items-center gap-4 text-left" onClick={() => setEditando(f)}>
                <AdminAvatar foto={f.foto} nome={f.nome} size={56} />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate">{f.nome}</strong>
                  <span className="block text-sm text-(--text-muted) truncate">{f.especialidade || "—"}</span>
                  <span className="inline-block mt-1.5">
                    {f.ativo === false ? <Badge cor="neutro">escondida</Badge> : <Badge cor="verde">no site</Badge>}
                  </span>
                </span>
                <span className="text-(--rose-gold) text-sm shrink-0">Editar</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <EditorFuncionaria
          key={editando.id ?? "nova"}
          f={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={() => {
            setEditando(null);
            recarregar();
          }}
        />
      )}
    </div>
  );
}

function EditorFuncionaria({ f, aoFechar, aoSalvar }: { f: Partial<Funcionario>; aoFechar: () => void; aoSalvar: () => void }) {
  const acao = useAcao();
  const nova = !f.id;
  const [nome, setNome] = useState(f.nome ?? "");
  const [especialidade, setEspecialidade] = useState(f.especialidade ?? "");
  const [bio, setBio] = useState(f.bio ?? "");
  const [foto, setFoto] = useState(f.foto ?? "");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [ativo, setAtivo] = useState(f.ativo !== false);
  const [ordem, setOrdem] = useState(String(f.ordem ?? 0));
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    const { adminSaveFuncionario, uploadFuncionarioFoto } = await import("@/lib/actions");
    let url: string | null = foto.trim() || null;
    if (arquivo) {
      const up = await acao(async () => {
        const r = await uploadFuncionarioFoto(arquivo);
        return { ok: !!r.url, erro: r.erro, url: r.url };
      });
      if (!up?.ok) {
        setSalvando(false);
        return;
      }
      url = up.url ?? null;
    }
    const r = await acao(
      () =>
        adminSaveFuncionario({
          id: f.id,
          nome,
          especialidade: especialidade || null,
          bio: bio || null,
          foto: url,
          ativo,
          ordem: Number(ordem) || 0,
        }),
      nova ? "Profissional cadastrada." : "Alterações salvas."
    );
    setSalvando(false);
    if (r?.ok) aoSalvar();
  }

  async function excluir() {
    if (!f.id || !confirm(`Remover ${f.nome} da equipe?`)) return;
    const { adminDeleteFuncionario } = await import("@/lib/actions");
    const r = await acao(() => adminDeleteFuncionario(f.id!), "Removida da equipe.");
    if (r?.ok) aoSalvar();
  }

  return (
    <Gaveta
      aberta
      titulo={nova ? "Nova profissional" : `Editar: ${f.nome}`}
      aoFechar={aoFechar}
      rodape={
        <div className="flex gap-2">
          {!nova && (
            <button className="btn btn-danger py-3! px-4!" onClick={excluir} disabled={salvando}>
              Excluir
            </button>
          )}
          <button className="btn btn-primary flex-1" onClick={salvar} disabled={salvando || nome.trim().length < 2}>
            {salvando ? "Salvando..." : nova ? "Cadastrar" : "Salvar"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <CampoImagem url={foto} arquivo={arquivo} aoMudarUrl={setFoto} aoMudarArquivo={setArquivo} formato="redondo" />
        <Campo rotulo="Nome" obrigatorio>
          <input className="input-lux" maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} />
        </Campo>
        <Campo rotulo="Especialidade">
          <input className="input-lux" maxLength={60} placeholder="Ex.: Lash Designer" value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} />
        </Campo>
        <Campo rotulo="Apresentação curta" ajuda={`${bio.length}/280`}>
          <textarea className="input-lux resize-y min-h-[80px]" maxLength={280} value={bio} onChange={(e) => setBio(e.target.value)} />
        </Campo>
        <Campo rotulo="Posição" ajuda="Números menores aparecem primeiro">
          <input className="input-lux" inputMode="numeric" value={ordem} onChange={(e) => setOrdem(e.target.value.replace(/\D/g, ""))} />
        </Campo>
        <Interruptor ligado={ativo} aoMudar={setAtivo} rotulo="Aparece no site" />
      </div>
    </Gaveta>
  );
}
