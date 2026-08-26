import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ShareButtons from "@/components/ShareButtons";
import { getPostBySlug, getAllSlugs } from "@/lib/marketing-actions";
import type { Metadata } from "next";

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post nao encontrado" };
  return {
    title: post.titulo,
    description: post.resumo || post.titulo,
    openGraph: { title: post.titulo, description: post.resumo || "", type: "article" },
    alternates: { canonical: `/blog/${slug}` },
  };
}

export const revalidate = 60;

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const paragraphs = post.conteudo.split("\n").filter(Boolean);

  return (
    <>
      <Navbar />
      <main className="pt-[calc(env(safe-area-inset-top)+76px)]">
        <article className="section">
          <div className="container-x max-w-3xl">
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm mb-8 transition-colors" style={{ color: "var(--rose-gold)" }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Voltar ao Blog
            </Link>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {(post.tags ?? []).map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                  style={{ background: "var(--rose-gold)", color: "#14100c" }}>
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="font-heading text-3xl md:text-4xl text-(--rose-gold-light) mb-4">
              {post.titulo}
            </h1>

            <div className="flex items-center justify-between mb-8">
              <span className="text-xs text-(--text-muted)">
                {post.criado_em ? new Date(post.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : ""}
              </span>
              <ShareButtons title={post.titulo} />
            </div>

            {post.imagem && (
              <div className="rounded-2xl overflow-hidden mb-8">
                <Image src={post.imagem} alt={post.titulo} width={800} height={450} className="w-full h-auto object-cover" />
              </div>
            )}

            <div className="space-y-4">
              {paragraphs.map((p, i) => {
                if (p.startsWith("## ")) return <h2 key={i} className="font-heading text-2xl text-(--rose-gold-light) mt-8 mb-3">{p.replace("## ", "")}</h2>;
                if (p.startsWith("### ")) return <h3 key={i} className="font-heading text-xl text-(--rose-gold-light) mt-6 mb-2">{p.replace("### ", "")}</h3>;
                if (p.startsWith("- ")) return <li key={i} className="text-(--text-muted) ml-4 mb-1 list-disc">{p.replace(/^- /, "")}</li>;
                return <p key={i} className="text-(--text-muted) leading-relaxed mb-4">{p}</p>;
              })}
            </div>

            <div className="lux-card mt-12 p-8 text-center">
              <p className="text-lg font-heading text-(--rose-gold-light) mb-3">Gostou do artigo?</p>
              <p className="text-sm text-(--text-muted) mb-6">Agende seu horario e descubra nossas tecnicas exclusivas.</p>
              <a href="https://wa.me/5511932139081?text=Ol%C3%A1%2C%20gostaria%20de%20agendar%20um%20hor%C3%A1rio" target="_blank" rel="noopener noreferrer"
                className="btn btn-primary">
                Agendar pelo WhatsApp
              </a>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}