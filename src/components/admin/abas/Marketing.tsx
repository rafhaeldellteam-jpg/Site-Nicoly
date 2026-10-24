"use client";

import { useState } from "react";
import type { BlogPost, Newsletter, Promocao, Referral } from "@/lib/types";
import {
  Badge,
  BarraAba,
  Campo,
  CampoImagem,
  Carregando,
  ErroCarregar,
  Gaveta,
  Interruptor,
  ListaVazia,
  useAcao,
  useAvisos,
  useDados,
} from "../ui";

type Sub = "blog" | "promocoes" | "newsletter" | "indicacoes";

interface DadosMarketing {
  posts: BlogPost[];
  promos: Promocao[];
  newsletter: Newsletter[];
  indicacoes: Referral[];
}

async function enviarImagem(arquivo: File | null, atual: string): Promise<{ ok: boolean; erro?: string; url?: string | null }> {
  if (!arquivo) return { ok: true, url: atual.trim() || null };
  const { uploadNovidadeImagem } = await import("@/lib/novidades-actions");
  const r = await uploadNovidadeImagem(arquivo);
  return { ok: !!r.url, erro: r.erro, url: r.url ?? null };
}

export default function AbaMarketing() {
  const { dados, erro, recarregar } = useDados<DadosMarketing>(async () => {
    const m = await import("@/lib/marketing-actions");
    const [posts, promos, newsletter, indicacoes] = await Promise.all([
      m.adminGetBlogPosts(),
      m.adminGetPromocoes(),
      m.adminGetNewsletter(),
      m.adminGetReferrals(),
    ]);
    return { posts, promos, newsletter, indicacoes };
  });
  const [sub, setSub] = useState<Sub>("blog");

  if (erro) return <ErroCarregar aoTentar={recarregar} />;
  if (!dados) return <Carregando texto="Carregando marketing..." />;

  const abas: [Sub, string, number][] = [
    ["blog", "Blog", dados.posts.length],
    ["promocoes", "Promoções", dados.promos.length],
    ["newsletter", "Newsletter", dados.newsletter.length],
    ["indicacoes", "Indicações", dados.indicacoes.length],
  ];

  return (
    <div className="space-y-6">
      <div className="adm-filtros adm-filtros-rolagem" role="tablist">
        {abas.map(([v, r, n]) => (
          <button key={v} role="tab" aria-selected={sub === v} className={sub === v ? "on" : ""} onClick={() => setSub(v)}>
            {r} <small>{n}</small>
          </button>
        ))}
      </div>

      {sub === "blog" && <Blog posts={dados.posts} aoMudar={recarregar} />}
      {sub === "promocoes" && <Promocoes promos={dados.promos} aoMudar={recarregar} />}
      {sub === "newsletter" && <ListaNewsletter itens={dados.newsletter} aoMudar={recarregar} />}
      {sub === "indicacoes" && <ListaIndicacoes itens={dados.indicacoes} />}
    </div>
  );
}

/* ================= BLOG ================= */

function Blog({ posts, aoMudar }: { posts: BlogPost[]; aoMudar: () => void }) {
  const acao = useAcao();
  const [editando, setEditando] = useState<Partial<BlogPost> | null>(null);

  async function publicar(p: BlogPost) {
    const { adminSaveBlogPost } = await import("@/lib/marketing-actions");
    const r = await acao(() => adminSaveBlogPost({ ...p, publicado: !p.publicado }), p.publicado ? "Post virou rascunho." : "Post publicado!");
    if (r?.ok) aoMudar();
  }

  return (
    <>
      <BarraAba resumo={`${posts.filter((p) => p.publicado).length} publicados`}>
        <button className="btn btn-primary py-2.5! px-5! text-[0.88rem]!" onClick={() => setEditando({ publicado: false, tags: [] })}>
          + Novo post
        </button>
      </BarraAba>
      {posts.length === 0 ? (
        <ListaVazia>Nenhum post ainda. Dicas de cuidados com os cílios são ótimas para atrair clientes pelo Google.</ListaVazia>
      ) : (
        <ul className="adm-lista">
          {posts.map((p) => (
            <li key={p.id} className="adm-item">
              <div className="adm-item-info">
                <div className="flex items-center gap-2 flex-wrap">
                  <strong className="truncate">{p.titulo}</strong>
                  <Badge cor={p.publicado ? "verde" : "amarelo"}>{p.publicado ? "publicado" : "rascunho"}</Badge>
                </div>
                <span className="truncate">/blog/{p.slug}</span>
              </div>
              <div className="adm-item-acoes">
                <button className="btn btn-outline py-2! px-3! text-[0.78rem]!" onClick={() => publicar(p)}>
                  {p.publicado ? "Despublicar" : "Publicar"}
                </button>
                <button className="btn btn-primary py-2! px-4! text-[0.78rem]!" onClick={() => setEditando(p)}>
                  Editar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editando && (
        <EditorPost
          key={editando.id ?? "novo"}
          post={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={() => {
            setEditando(null);
            aoMudar();
          }}
        />
      )}
    </>
  );
}

function EditorPost({ post, aoFechar, aoSalvar }: { post: Partial<BlogPost>; aoFechar: () => void; aoSalvar: () => void }) {
  const acao = useAcao();
  const novo = !post.id;
  const [titulo, setTitulo] = useState(post.titulo ?? "");
  const [slug, setSlug] = useState(post.slug ?? "");
  const [resumo, setResumo] = useState(post.resumo ?? "");
  const [conteudo, setConteudo] = useState(post.conteudo ?? "");
  const [tags, setTags] = useState((post.tags ?? []).join(", "));
  const [imagem, setImagem] = useState(post.imagem ?? "");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [publicado, setPublicado] = useState(post.publicado === true);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    const up = await acao(() => enviarImagem(arquivo, imagem));
    if (!up?.ok) {
      setSalvando(false);
      return;
    }
    const { adminSaveBlogPost } = await import("@/lib/marketing-actions");
    const r = await acao(
      () =>
        adminSaveBlogPost({
          id: post.id,
          titulo,
          slug,
          resumo,
          conteudo,
          imagem: up.url ?? null,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          publicado,
        }),
      publicado ? "Post salvo e publicado." : "Rascunho salvo."
    );
    setSalvando(false);
    if (r?.ok) aoSalvar();
  }

  async function excluir() {
    if (!post.id || !confirm(`Excluir o post "${post.titulo}"?`)) return;
    const { adminDeleteBlogPost } = await import("@/lib/marketing-actions");
    const r = await acao(() => adminDeleteBlogPost(post.id!), "Post excluído.");
    if (r?.ok) aoSalvar();
  }

  return (
    <Gaveta
      aberta
      titulo={novo ? "Novo post" : "Editar post"}
      aoFechar={aoFechar}
      rodape={
        <div className="flex gap-2">
          {!novo && (
            <button className="btn btn-danger py-3! px-4!" onClick={excluir} disabled={salvando}>
              Excluir
            </button>
          )}
          <button className="btn btn-primary flex-1" onClick={salvar} disabled={salvando || titulo.trim().length < 3 || conteudo.trim().length < 20}>
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <Campo rotulo="Título" obrigatorio>
          <input className="input-lux" maxLength={140} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </Campo>
        <Campo rotulo="Endereço da página" ajuda="Se vazio, é criado a partir do título.">
          <input className="input-lux" maxLength={80} placeholder="como-cuidar-dos-cilios" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </Campo>
        <Campo rotulo="Resumo" ajuda="Aparece na lista do blog e no Google">
          <textarea className="input-lux resize-y min-h-[70px]" maxLength={300} value={resumo} onChange={(e) => setResumo(e.target.value)} />
        </Campo>
        <CampoImagem url={imagem} arquivo={arquivo} aoMudarUrl={setImagem} aoMudarArquivo={setArquivo} rotulo="Imagem de capa" formato="largo" />
        <Campo rotulo="Conteúdo" obrigatorio ajuda="Cada linha vira um parágrafo.">
          <textarea className="input-lux resize-y min-h-[220px]" maxLength={20000} value={conteudo} onChange={(e) => setConteudo(e.target.value)} />
        </Campo>
        <Campo rotulo="Tags" ajuda="Separe por vírgula">
          <input className="input-lux" placeholder="cuidados, volume, dicas" value={tags} onChange={(e) => setTags(e.target.value)} />
        </Campo>
        <Interruptor ligado={publicado} aoMudar={setPublicado} rotulo="Publicado" descricao="Desligado: fica como rascunho, só você vê." />
      </div>
    </Gaveta>
  );
}

/* ================= PROMOÇÕES ================= */

function Promocoes({ promos, aoMudar }: { promos: Promocao[]; aoMudar: () => void }) {
  const acao = useAcao();
  const [editando, setEditando] = useState<Partial<Promocao> | null>(null);

  async function alternar(p: Promocao) {
    const { adminSavePromocao } = await import("@/lib/marketing-actions");
    const r = await acao(() => adminSavePromocao({ ...p, ativa: !p.ativa }), p.ativa ? "Promoção desativada." : "Promoção ativada.");
    if (r?.ok) aoMudar();
  }

  return (
    <>
      <BarraAba resumo="Aparecem na página /promocoes. Para destacar ao abrir o site, use a aba Novidades.">
        <button className="btn btn-primary py-2.5! px-5! text-[0.88rem]!" onClick={() => setEditando({ ativa: true })}>
          + Nova promoção
        </button>
      </BarraAba>
      {promos.length === 0 ? (
        <ListaVazia>Nenhuma promoção cadastrada.</ListaVazia>
      ) : (
        <ul className="adm-lista">
          {promos.map((p) => (
            <li key={p.id} className="adm-item">
              <div className="adm-item-info">
                <div className="flex items-center gap-2 flex-wrap">
                  <strong className="truncate">{p.titulo}</strong>
                  <Badge cor={p.ativa ? "verde" : "neutro"}>{p.ativa ? "ativa" : "inativa"}</Badge>
                </div>
                <span className="truncate">{[p.desconto, p.cupom && `cupom ${p.cupom}`, p.validade && `até ${p.validade}`].filter(Boolean).join(" · ") || "—"}</span>
              </div>
              <div className="adm-item-acoes">
                <button className="btn btn-outline py-2! px-3! text-[0.78rem]!" onClick={() => alternar(p)}>
                  {p.ativa ? "Desativar" : "Ativar"}
                </button>
                <button className="btn btn-primary py-2! px-4! text-[0.78rem]!" onClick={() => setEditando(p)}>
                  Editar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editando && (
        <EditorPromo
          key={editando.id ?? "nova"}
          promo={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={() => {
            setEditando(null);
            aoMudar();
          }}
        />
      )}
    </>
  );
}

function EditorPromo({ promo, aoFechar, aoSalvar }: { promo: Partial<Promocao>; aoFechar: () => void; aoSalvar: () => void }) {
  const acao = useAcao();
  const nova = !promo.id;
  const [titulo, setTitulo] = useState(promo.titulo ?? "");
  const [descricao, setDescricao] = useState(promo.descricao ?? "");
  const [desconto, setDesconto] = useState(promo.desconto ?? "");
  const [cupom, setCupom] = useState(promo.cupom ?? "");
  const [validade, setValidade] = useState(promo.validade ?? "");
  const [imagem, setImagem] = useState(promo.imagem ?? "");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [ativa, setAtiva] = useState(promo.ativa !== false);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    const up = await acao(() => enviarImagem(arquivo, imagem));
    if (!up?.ok) {
      setSalvando(false);
      return;
    }
    const { adminSavePromocao } = await import("@/lib/marketing-actions");
    const r = await acao(
      () => adminSavePromocao({ id: promo.id, titulo, descricao, desconto, cupom, validade, imagem: up.url ?? null, ativa }),
      nova ? "Promoção criada." : "Promoção atualizada."
    );
    setSalvando(false);
    if (r?.ok) aoSalvar();
  }

  async function excluir() {
    if (!promo.id || !confirm(`Excluir a promoção "${promo.titulo}"?`)) return;
    const { adminDeletePromocao } = await import("@/lib/marketing-actions");
    const r = await acao(() => adminDeletePromocao(promo.id!), "Promoção excluída.");
    if (r?.ok) aoSalvar();
  }

  return (
    <Gaveta
      aberta
      titulo={nova ? "Nova promoção" : "Editar promoção"}
      aoFechar={aoFechar}
      rodape={
        <div className="flex gap-2">
          {!nova && (
            <button className="btn btn-danger py-3! px-4!" onClick={excluir} disabled={salvando}>
              Excluir
            </button>
          )}
          <button className="btn btn-primary flex-1" onClick={salvar} disabled={salvando || titulo.trim().length < 3}>
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <Campo rotulo="Título" obrigatorio>
          <input className="input-lux" maxLength={120} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </Campo>
        <Campo rotulo="Descrição">
          <textarea className="input-lux resize-y min-h-[90px]" maxLength={800} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </Campo>
        <div className="adm-grade-form">
          <Campo rotulo="Desconto">
            <input className="input-lux" maxLength={40} placeholder="20% off" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
          </Campo>
          <Campo rotulo="Cupom">
            <input className="input-lux uppercase" maxLength={30} placeholder="NIC20" value={cupom} onChange={(e) => setCupom(e.target.value)} />
          </Campo>
          <Campo rotulo="Validade" className="sm:col-span-2">
            <input className="input-lux" maxLength={40} placeholder="30/11 ou 'enquanto durar'" value={validade} onChange={(e) => setValidade(e.target.value)} />
          </Campo>
        </div>
        <CampoImagem url={imagem} arquivo={arquivo} aoMudarUrl={setImagem} aoMudarArquivo={setArquivo} rotulo="Imagem" formato="largo" />
        <Interruptor ligado={ativa} aoMudar={setAtiva} rotulo="Ativa" />
      </div>
    </Gaveta>
  );
}

/* ================= NEWSLETTER ================= */

function ListaNewsletter({ itens, aoMudar }: { itens: Newsletter[]; aoMudar: () => void }) {
  const acao = useAcao();
  const avisar = useAvisos();

  function copiar() {
    const texto = itens.map((n) => n.contato).join("\n");
    navigator.clipboard
      ?.writeText(texto)
      .then(() => avisar("ok", `${itens.length} contatos copiados.`))
      .catch(() => avisar("erro", "Não foi possível copiar."));
  }

  function baixarCsv() {
    const linhas = [["nome", "contato", "tipo", "inscrito_em"], ...itens.map((n) => [n.nome ?? "", n.contato, n.tipo ?? "", n.criado_em ?? ""])];
    const csv = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "newsletter-nicbeautty.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function remover(n: Newsletter) {
    if (!confirm(`Remover ${n.contato} da lista?`)) return;
    const { adminDeleteNewsletter } = await import("@/lib/marketing-actions");
    const r = await acao(() => adminDeleteNewsletter(n.id!), "Removido da lista.");
    if (r?.ok) aoMudar();
  }

  return (
    <>
      <BarraAba resumo={`${itens.length} inscritos`}>
        {itens.length > 0 && (
          <>
            <button className="btn btn-outline py-2! px-4! text-[0.82rem]!" onClick={copiar}>
              Copiar contatos
            </button>
            <button className="btn btn-outline py-2! px-4! text-[0.82rem]!" onClick={baixarCsv}>
              Baixar planilha
            </button>
          </>
        )}
      </BarraAba>
      {itens.length === 0 ? (
        <ListaVazia>Ninguém se inscreveu ainda. O formulário fica no rodapé do site.</ListaVazia>
      ) : (
        <ul className="adm-lista">
          {itens.map((n) => (
            <li key={n.id} className="adm-item">
              <div className="adm-item-info">
                <strong className="truncate">{n.nome || "Sem nome"}</strong>
                <span className="truncate">
                  {n.contato} · {n.tipo === "email" ? "e-mail" : "WhatsApp"}
                  {n.criado_em ? ` · ${new Date(n.criado_em).toLocaleDateString("pt-BR")}` : ""}
                </span>
              </div>
              <div className="adm-item-acoes">
                <button className="adm-icone-btn perigo" onClick={() => remover(n)} aria-label={`Remover ${n.contato}`}>
                  &times;
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ================= INDICAÇÕES ================= */

function ListaIndicacoes({ itens }: { itens: Referral[] }) {
  return (
    <>
      <BarraAba resumo={`${itens.filter((r) => r.status === "utilizado").length} de ${itens.length} códigos já usados`} />
      {itens.length === 0 ? (
        <ListaVazia>Nenhuma indicação ainda.</ListaVazia>
      ) : (
        <ul className="adm-lista">
          {itens.map((r) => (
            <li key={r.id} className="adm-item">
              <div className="adm-item-hora">
                <strong className="tracking-widest">{r.code}</strong>
              </div>
              <div className="adm-item-info">
                <span className="truncate">
                  Indicou: <strong className="text-(--text-main)">{r.referrer_name}</strong> {r.referrer_whatsapp && `(${r.referrer_whatsapp})`}
                </span>
                {r.referred_name && (
                  <span className="truncate">
                    Indicada: {r.referred_name} {r.referred_whatsapp && `(${r.referred_whatsapp})`}
                  </span>
                )}
              </div>
              <div className="adm-item-acoes">
                <Badge cor={r.status === "utilizado" ? "verde" : "amarelo"}>{r.status === "utilizado" ? "usado" : "pendente"}</Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
