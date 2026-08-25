import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import BookingModal from "@/components/BookingModal";
import { ServiceBookingButton } from "@/components/TriggerButtons";
import { getServices } from "@/lib/actions";
import { IconStar, IconClock, IconSparkle, IconRefresh, IconHeart } from "@/components/icons";

export const metadata: Metadata = {
  title: "Catálogo de Serviços",
  description:
    "Fio a Fio, Volume Brasileiro, Volume 5D, Fox Eyes e mais. Extensão de cílios premium com a Nicbeautty Lash Designer.",
  alternates: { canonical: "/catalogo" },
};

export const revalidate = 120;

export default async function CatalogoPage() {
  const services = await getServices();

  return (
    <>
      <Navbar />
      <Reveal />

      <header className="pt-[calc(env(safe-area-inset-top)+120px)] md:pt-[140px] pb-12 md:pb-16 text-center px-6" style={{ background: "var(--bg-secondary)" }}>
        <span className="section-subtitle">Técnicas Exclusivas</span>
        <h1 className="section-title">Catálogo</h1>
        <p className="text-(--text-muted) max-w-xl mx-auto">
          Cada técnica é escolhida junto com você no mapping personalizado, para um
          resultado único e harmonioso.
        </p>
      </header>

      <main className="section pt-14!">
        <div className="container-x">
          {services.length === 0 ? (
            <p className="text-center text-(--text-muted) py-20">
              Nenhum serviço encontrado.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {services.map((s) => (
                <article key={s.id} className={`lux-card overflow-hidden flex flex-col ${s.id === 2 ? "border-(--rose-gold)!" : ""}`}>
                  {s.id === 2 && (
                    <div
                      className="text-center text-xs font-bold tracking-[2px] uppercase py-2"
                      style={{
                        background: "linear-gradient(90deg, var(--rose-gold-dark), var(--rose-gold-light), var(--rose-gold-dark))",
                        color: "#14100c",
                      }}
                    >
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <IconStar size={12} /> Mais Pedido <IconStar size={12} />
                      </span>
                    </div>
                  )}
                  <div className="aspect-[4/3] overflow-hidden">
                    {s.imagem && (
                      <Image
                        src={s.imagem}
                        alt={s.nome}
                        width={600}
                        height={450}
                        loading="lazy"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                      />
                    )}
                  </div>

                  <div className="p-5 md:p-6 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-heading text-[1.35rem] md:text-2xl text-(--rose-gold-light)">{s.nome}</h3>
                      {s.preco != null && (
                        <span className="font-heading text-xl whitespace-nowrap text-(--rose-gold)">
                          R$ {Number(s.preco).toFixed(2).replace(".", ",")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-(--text-muted) mt-2 leading-relaxed">{s.descricao}</p>

                    <div className="mt-4 space-y-2.5 text-sm">
                      <InfoRow icon={<IconClock size={14} />} label="Duração" value={s.duracao} />
                      <InfoRow icon={<IconSparkle size={14} />} label="Aplicação" value={s.aplicacao} strong />
                      {s.manutencao && s.manutencao.length > 0 && (
                        <div className="flex gap-2 pt-1">
                          <span className="text-(--rose-gold) w-4 shrink-0"><IconRefresh size={14} /></span>
                          <div>
                            <span className="text-(--text-muted)">Manutenção:</span>
                            <div className="mt-1 space-y-0.5">
                              {s.manutencao.map((m, i) => (
                                <div key={i} className="text-sm">
                                  <strong>{m.valor}</strong>{" "}
                                  <small className="text-(--text-muted)">({m.prazo})</small>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto pt-6">
                      <ServiceBookingButton serviceId={s.id}>
                        {s.textobotao || `Agendar ${s.nome}`}
                      </ServiceBookingButton>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="text-center mt-16">
            <Link href="/planos" className="btn btn-outline px-10!">
              <IconHeart size={15} className="inline-block -mt-[2px] mr-1.5 text-(--rose-gold-light)" />
              Conheça nossos Planos
            </Link>
          </div>
        </div>
      </main>

      <Footer />
      <BookingModal />
    </>
  );
}

function InfoRow({
  icon,
  label,
  value,
  strong,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-(--rose-gold) w-4 shrink-0">{icon}</span>
      <span className="text-(--text-muted)">{label}:</span>
      <strong className={strong ? "text-(--rose-gold-light) text-base" : ""}>{value}</strong>
    </div>
  );
}
