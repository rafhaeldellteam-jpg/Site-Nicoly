"use client";

import { useCallback, useEffect, useState } from "react";
import type { BlogPost, Promocao, Newsletter, Referral } from "@/lib/types";

export default function MarketingPanel() {
  const [subTab, setSubTab] = useState<"blog" | "promocoes" | "newsletter" | "referrals">("blog");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [promos, setPromos] = useState<Promocao[]>([]);
  const [newsletter, setNewsletter] = useState<Newsletter[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mod = await import("@/lib/marketing-actions");
      const [p, pr, nl, r] = await Promise.all([
        mod.adminGetBlogPosts(),
        mod.adminGetPromocoes(),
        mod.adminGetNewsletter(),
        mod.adminGetReferrals(),
      ]);
      setPosts(p);
      setPromos(pr);
      setNewsletter(nl);
      setReferrals(r);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function deletePost(id: number) {
    if (!confirm("Excluir este post?")) return;
    const { adminDeleteBlogPost } = await import("@/lib/marketing-actions");
    await adminDeleteBlogPost(id);
    load();
  }

  async function togglePost(post: BlogPost) {
    const { adminSaveBlogPost } = await import("@/lib/marketing-actions");
    await adminSaveBlogPost({ ...post, publicado: !post.publicado });
    load();
  }

  async function deletePromo(id: number) {
    if (!confirm("Excluir esta promocao?")) return;
    const { adminDeletePromocao } = await import("@/lib/marketing-actions");
    await adminDeletePromocao(id);
    load();
  }

  async function togglePromo(promo: Promocao) {
    const { adminSavePromocao } = await import("@/lib/marketing-actions");
    await adminSavePromocao({ ...promo, ativa: !promo.ativa });
    load();
  }

  async function deleteNewsletterItem(id: number) {
    if (!confirm("Remover esta inscricao?")) return;
    const { adminDeleteNewsletter } = await import("@/lib/marketing-actions");
    await adminDeleteNewsletter(id);
    load();
  }

  const tabs = [
    { key: "blog" as const, label: "Blog", count: posts.length },
    { key: "promocoes" as const, label: "Promocoes", count: promos.length },
    { key: "newsletter" as const, label: "Newsletter", count: newsletter.length },
    { key: "referrals" as const, label: "Indicacoes", count: referrals.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
            style={{
              background: subTab === t.key ? "var(--rose-gold)" : "var(--bg-card)",
              color: subTab === t.key ? "#14100c" : "var(--text-muted)",
              border: `1px solid ${subTab === t.key ? "var(--rose-gold)" : "var(--border-color)"}`,
            }}>
            {t.label}
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{
              background: subTab === t.key ? "rgba(0,0,0,0.15)" : "var(--bg-primary)",
              color: subTab === t.key ? "#14100c" : "var(--text-muted)",
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {loading && <p className="text-(--text-muted) text-sm">Carregando...</p>}

      {/* BLOG */}
      {subTab === "blog" && !loading && (
        <div className="space-y-4">
          {posts.length === 0 && <p className="text-(--text-muted) text-sm">Nenhum post criado.</p>}
          {posts.map(post => (
            <div key={post.id} className="lux-card p-5 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-heading text-lg text-(--rose-gold-light) truncate">{post.titulo}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0"
                    style={{ background: post.publicado ? "#22C55E20" : "#EAB30820", color: post.publicado ? "#22C55E" : "#EAB308" }}>
                    {post.publicado ? "Publicado" : "Rascunho"}
                  </span>
                </div>
                <p className="text-xs text-(--text-muted) truncate">/{post.slug}</p>
                {post.tags && <p className="text-[10px] text-(--text-muted) mt-1">Tags: {post.tags.join(", ")}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => togglePost(post)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: post.publicado ? "#EAB30820" : "#22C55E20", color: post.publicado ? "#EAB308" : "#22C55E" }}>
                  {post.publicado ? "Despublicar" : "Publicar"}
                </button>
                <button onClick={() => deletePost(post.id!)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "#EF444420", color: "#EF4444" }}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PROMOCOES */}
      {subTab === "promocoes" && !loading && (
        <div className="space-y-4">
          {promos.length === 0 && <p className="text-(--text-muted) text-sm">Nenhuma promocao criada.</p>}
          {promos.map(promo => (
            <div key={promo.id} className="lux-card p-5 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-heading text-lg text-(--rose-gold-light) truncate">{promo.titulo}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0"
                    style={{ background: promo.ativa ? "#22C55E20" : "#EF444420", color: promo.ativa ? "#22C55E" : "#EF4444" }}>
                    {promo.ativa ? "Ativa" : "Inativa"}
                  </span>
                </div>
                {promo.cupom && <p className="text-xs text-(--rose-gold)">Cupom: {promo.cupom}</p>}
                {promo.desconto && <p className="text-xs text-(--text-muted)">Desconto: {promo.desconto}</p>}
                {promo.validade && <p className="text-xs text-(--text-muted)">Validade: {promo.validade}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => togglePromo(promo)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: promo.ativa ? "#EAB30820" : "#22C55E20", color: promo.ativa ? "#EAB308" : "#22C55E" }}>
                  {promo.ativa ? "Desativar" : "Ativar"}
                </button>
                <button onClick={() => deletePromo(promo.id!)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "#EF444420", color: "#EF4444" }}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NEWSLETTER */}
      {subTab === "newsletter" && !loading && (
        <div className="space-y-4">
          {newsletter.length === 0 && <p className="text-(--text-muted) text-sm">Nenhuma inscricao na newsletter.</p>}
          {newsletter.map(nl => (
            <div key={nl.id} className="lux-card p-5 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-(--text-main)">{nl.nome || "Sem nome"}</p>
                <p className="text-xs text-(--text-muted)">{nl.contato} ({nl.tipo})</p>
                <p className="text-[10px] text-(--text-muted)">{nl.criado_em ? new Date(nl.criado_em).toLocaleDateString("pt-BR") : ""}</p>
              </div>
              <button onClick={() => deleteNewsletterItem(nl.id!)} className="px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
                style={{ background: "#EF444420", color: "#EF4444" }}>
                Remover
              </button>
            </div>
          ))}
        </div>
      )}

      {/* REFERRALS */}
      {subTab === "referrals" && !loading && (
        <div className="space-y-4">
          {referrals.length === 0 && <p className="text-(--text-muted) text-sm">Nenhuma indicacao registrada.</p>}
          {referrals.map(ref => (
            <div key={ref.id} className="lux-card p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tracking-widest" style={{ color: "var(--rose-gold)" }}>{ref.code}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: ref.status === "utilizado" ? "#22C55E20" : "#EAB30820", color: ref.status === "utilizado" ? "#22C55E" : "#EAB308" }}>
                    {ref.status === "utilizado" ? "Utilizado" : "Pendente"}
                  </span>
                </div>
                <span className="text-[10px] text-(--text-muted)">{ref.criado_em ? new Date(ref.criado_em).toLocaleDateString("pt-BR") : ""}</span>
              </div>
              <p className="text-xs text-(--text-muted)">Indicou: {ref.referrer_name} ({ref.referrer_whatsapp})</p>
              {ref.referred_name && <p className="text-xs text-(--text-muted)">Indicado: {ref.referred_name} ({ref.referred_whatsapp})</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}