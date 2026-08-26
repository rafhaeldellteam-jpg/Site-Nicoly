import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ShareButtons from "@/components/ShareButtons";
import { getPublishedPosts } from "@/lib/marketing-actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description: "Dicas de beleza, cuidados com cílios e tendências de extensão. Confira as publicações da Nicbeautty Lash Designer.",
  alternates: { canonical: "/blog" },
};

export const revalidate = 60;

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <>
      <Navbar />
      <main className="pt-[calc(env(safe-area-inset-top)+76px)]">
        <section className="section">
          <div className="container-x">
            <div className="text-center mb-14">
              <span className="section-subtitle">Dicas & Tendências</span>
              <h1 className="section-title">Blog Nicbeautty</h1>
              <p className="text-(--text-muted) max-w-lg mx-auto">
                Artigos sobre cuidados com cílios, técnicas de extensão e tudo sobre beleza.
              </p>
            </div>

            {posts.length === 0 && (
              <div className="text-center py-16">
                <p className="text-(--text-muted)">Em breve teremos novos conteúdos por aqui!</p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7 md:gap-6">
              {posts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="lux-card overflow-hidden group">
                  {post.imagem && (
                    <div className="overflow-hidden aspect-[16/9]">
                      <Image
                        src={post.imagem}
                        alt={post.titulo}
                        width={600}
                        height={340}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(post.tags ?? []).slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                          style={{ background: "var(--rose-gold)", color: "#14100c" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h2 className="font-heading text-xl text-(--rose-gold-light) group-hover:text-(--rose-gold) transition-colors mb-2">
                      {post.titulo}
                    </h2>
                    <p className="text-sm text-(--text-muted) line-clamp-3">{post.resumo}</p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-[10px] text-(--text-muted)">
                        {post.criado_em ? new Date(post.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                      </span>
                      <ShareButtons title={post.titulo} className="pointer-events-auto" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}