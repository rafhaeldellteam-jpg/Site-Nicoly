import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ShareButtons from "@/components/ShareButtons";
import { getActivePromocoes } from "@/lib/marketing-actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Promocoes",
  description: "Ofertas especiais e cupons de desconto da Nicbeautty Lash Designer. Aproveite nossas promocoes!",
  alternates: { canonical: "/promocoes" },
};

export const revalidate = 60;

export default async function PromocoesPage() {
  const promos = await getActivePromocoes();

  return (
    <>
      <Navbar />
      <main className="pt-[calc(env(safe-area-inset-top)+76px)]">
        <section className="section">
          <div className="container-x">
            <div className="text-center mb-14">
              <span className="section-subtitle">Ofertas Especiais</span>
              <h1 className="section-title">Promocoes</h1>
              <p className="text-(--text-muted) max-w-lg mx-auto">
                Aproveite nossas ofertas exclusivas e compartilhe com suas amigas!
              </p>
            </div>

            {promos.length === 0 && (
              <div className="text-center py-16">
                <p className="text-(--text-muted)">Nenhuma promocao ativa no momento. Volte em breve!</p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7 md:gap-6">
              {promos.map((promo) => (
                <div key={promo.id} className="lux-card overflow-hidden">
                  {promo.imagem && (
                    <div className="overflow-hidden aspect-[16/9]">
                      <Image
                        src={promo.imagem}
                        alt={promo.titulo}
                        width={600}
                        height={340}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      {promo.desconto && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                          style={{ background: "var(--rose-gold)", color: "#14100c" }}>
                          {promo.desconto}
                        </span>
                      )}
                      {promo.validade && (
                        <span className="text-[10px] text-(--text-muted)">
                          Valide: {promo.validade}
                        </span>
                      )}
                    </div>
                    <h2 className="font-heading text-xl text-(--rose-gold-light) mb-2">{promo.titulo}</h2>
                    <p className="text-sm text-(--text-muted) mb-4">{promo.descricao}</p>
                    {promo.cupom && (
                      <div className="p-3 rounded-xl text-center mb-4" style={{ background: "var(--bg-primary)", border: "1px dashed var(--border-color-strong)" }}>
                        <p className="text-[10px] uppercase tracking-wider text-(--text-muted) mb-1">Cupom</p>
                        <p className="text-lg font-bold tracking-widest" style={{ color: "var(--rose-gold)" }}>{promo.cupom}</p>
                      </div>
                    )}
                    <ShareButtons title={`${promo.titulo} - Nicbeautty`} />
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-14">
              <Link href="/" className="btn btn-outline">
                Voltar ao Inicio
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}