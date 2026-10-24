import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import GlitterCanvas from "@/components/GlitterCanvas";
import HeroLogo from "@/components/HeroLogo";
import FeedbackModal from "@/components/FeedbackModal";
import FeedbackList from "@/components/FeedbackList";
import ShareButtons from "@/components/ShareButtons";
import NewsletterForm from "@/components/NewsletterForm";
import { getApprovedFeedbacks, getFuncionarios, getGaleria } from "@/lib/actions";
import { imagemOtimizavel } from "@/lib/imagens";
import { ENDERECO, MAPS_URL } from "@/lib/endereco";
import LinkWhatsapp from "@/components/LinkWhatsapp";
import { BookingButton, FeedbackButton } from "@/components/TriggerButtons";
import { IconSparkle, IconChat, WhatsAppIcon, InstagramIcon, GoogleMapsIcon } from "@/components/icons";

const STORAGE = "https://jfqfbpjimozevtjscbej.supabase.co/storage/v1/object/public/products";

const GALERIA = [
  {
    src: `${STORAGE}/volume_brasileiro_mais_claro.png`,
    alt: "Volume Brasileiro",
    titulo: "Volume Brasileiro",
    desc: "Fios em Y com excelente retenção e efeito marcante",
  },
  {
    src: `${STORAGE}/efeito_fox.png`,
    alt: "Efeito Fox Eye",
    titulo: "Efeito Fox Eye",
    desc: "Efeito alongado que valoriza o formato dos olhos com elegância",
  },
  {
    src: `${STORAGE}/Egipicio.png`,
    alt: "Egípcio",
    titulo: "Egípcio",
    desc: "Textura marcante e preenchimento intenso com fios cruzados",
  },
];

const DIFERENCIAIS = [
  {
    titulo: "Mapping Personalizado",
    desc: "Mapeamento de olhar sob medida para valorizar o formato dos seus olhos e expressar sua personalidade.",
  },
  {
    titulo: "Materiais de Alta Gama",
    desc: "Fios ultra leves e adesivos hipoalergênicos testados e aprovados para conforto e saúde ocular.",
  },
  {
    titulo: "Atendimento VIP",
    desc: "Ambiente acolhedor, climatizado e pensado em cada detalhe para você relaxar durante o procedimento.",
  },
];

// Para abrir direto a tela de avaliação, defina NEXT_PUBLIC_GOOGLE_PLACE_ID na Vercel
// (o ID do perfil da Nicbeautty no Google). Sem ele, abre a busca do perfil no Google.
const GOOGLE_PLACE_ID = process.env.NEXT_PUBLIC_GOOGLE_PLACE_ID;
const GOOGLE_REVIEW_URL = GOOGLE_PLACE_ID
  ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(GOOGLE_PLACE_ID)}`
  : "https://www.google.com/search?q=Nicbeautty+Lash+Designer+avalia%C3%A7%C3%B5es";

export const revalidate = 60;

export default async function Home() {
  const [feedbacks, galeriaDb, equipeDb] = await Promise.all([
    getApprovedFeedbacks(),
    getGaleria(),
    getFuncionarios(),
  ]);
  const equipe = equipeDb.filter((f) => f.ativo !== false);
  const galeria = galeriaDb.length
    ? galeriaDb.map((g) => ({
        src: g.imagem,
        alt: g.titulo,
        titulo: g.titulo,
        desc: g.descricao ?? "",
      }))
    : GALERIA;

  return (
    <>
      <Navbar />
      <Reveal />

      {/* ===== HERO ===== */}
      <header id="inicio" className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
        <GlitterCanvas />
        <div className="relative z-10 text-center px-5 sm:px-6 pt-[calc(env(safe-area-inset-top)+88px)] md:pt-[calc(env(safe-area-inset-top)+110px)] pb-14 max-w-3xl mx-auto reveal active">
          <HeroLogo src={`${STORAGE}/nick_logo_$K.png`} />
          <div className="mt-6 inline-flex items-center gap-2 text-(--rose-gold) text-xs tracking-[3px] uppercase font-semibold">
            <IconSparkle size={11} /> Lash Designer Specialist <IconSparkle size={11} />
          </div>
          <h1 className="font-heading text-[clamp(1.9rem,7.5vw,4rem)] font-bold leading-[1.12] mt-3 mb-4">
            Realce a beleza e a <span className="logo-shimmer">elegância</span> do seu olhar
          </h1>
          <p className="text-(--text-muted) text-base md:text-lg max-w-xl mx-auto mb-8">
            Técnicas exclusivas de extensão de cílios com acabamento sofisticado, máxima
            durabilidade e total biossegurança.
          </p>

          <div className="hero-ctas flex flex-col min-[480px]:flex-row min-[480px]:flex-wrap justify-center gap-3 md:gap-4 max-w-sm min-[480px]:max-w-none mx-auto">
            <BookingButton className="btn btn-primary btn-pulse">
              <WhatsAppIcon size={18} /> Agendar Horário
            </BookingButton>
            <div className="grid grid-cols-2 min-[480px]:contents gap-3">
              <Link href="/catalogo" className="btn btn-outline">
                Ver Catálogo
              </Link>
              <Link href="/planos" className="btn btn-outline">
                Nossos Planos
              </Link>
            </div>
          </div>

          <a href="#sobre" className="scroll-hint" aria-label="Rolar para os diferenciais">
            <span />
          </a>
        </div>
      </header>

      <main>
        {/* ===== DIFERENCIAIS ===== */}
        <section id="sobre" className="section reveal">
          <div className="container-x text-center">
            <span className="section-subtitle">Exclusividade &amp; Cuidado</span>
            <h2 className="section-title">A Experiência Nicbeautty</h2>
            <div className="grid md:grid-cols-3 gap-7 md:gap-6 mt-12">
              {DIFERENCIAIS.map((d) => (
                <div key={d.titulo} className="lux-card p-9 text-left">
                  <h3 className="font-heading text-2xl text-(--rose-gold-light) mb-3">{d.titulo}</h3>
                  <p className="text-(--text-muted) leading-relaxed">{d.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== EQUIPE (cadastrada no painel → Equipe) ===== */}
        {equipe.length > 0 && (
          <section id="equipe" className="section pt-0! reveal">
            <div className="container-x text-center">
              <span className="section-subtitle">Quem cuida de você</span>
              <h2 className="section-title">Nossa equipe</h2>
              <div className="flex flex-wrap justify-center gap-5 mt-10">
                {equipe.map((f) => (
                  <article key={f.id} className="lux-card p-6 w-full sm:w-[300px] text-center">
                    {f.foto ? (
                      <Image
                        src={f.foto}
                        alt={f.nome}
                        width={112}
                        height={112}
                        loading="lazy"
                        unoptimized={!imagemOtimizavel(f.foto)}
                        className="w-28 h-28 mx-auto rounded-full object-cover border-2 border-(--border-color-strong)"
                      />
                    ) : (
                      <span className="w-28 h-28 mx-auto rounded-full flex items-center justify-center font-heading text-4xl text-(--rose-gold) border-2 border-(--border-color-strong) bg-(--bg-tertiary)">
                        {f.nome.charAt(0)}
                      </span>
                    )}
                    <h3 className="font-heading text-2xl text-(--rose-gold-light) mt-4">{f.nome}</h3>
                    {f.especialidade && <p className="text-xs uppercase tracking-[2px] text-(--rose-gold) mt-1">{f.especialidade}</p>}
                    {f.bio && <p className="text-sm text-(--text-muted) mt-3 leading-relaxed">{f.bio}</p>}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ===== GALERIA ===== */}
        <section id="galeria" className="section section-alt reveal">
          <div className="container-x">
            <div className="text-center">
              <span className="section-subtitle">Resultados Reais</span>
              <h2 className="section-title">Galeria de Transformações</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7 md:gap-6 mt-12">
              {galeria.map((g, i) => (
                <figure key={`${g.titulo}-${i}`} className="lux-card overflow-hidden rounded-3xl! group">
                  <div className="overflow-hidden aspect-square">
                    <Image
                      src={g.src}
                      unoptimized={!imagemOtimizavel(g.src)}
                      alt={g.alt}
                      width={500}
                      height={500}
                      loading="lazy"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                  <figcaption className="p-6">
                    <h4 className="font-heading text-xl text-(--rose-gold-light)">{g.titulo}</h4>
                    <p className="text-sm text-(--text-muted) mt-1">{g.desc}</p>
                    <ShareButtons title={`${g.titulo} - Nicbeautty`} className="mt-3" />
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CONVITE PARA AVALIAR + GOOGLE REVIEWS ===== */}
        <section className="py-[70px] reveal">
          <div className="container-x">
            <div className="lux-card rounded-[24px]! max-w-[700px] mx-auto text-center px-5 py-10 sm:px-8 sm:py-14">
              <span className="section-subtitle">Sua voz é importante</span>
              <h2 className="font-heading text-2xl sm:text-3xl mt-2 mb-3">Compartilhe sua experiência</h2>
              <p className="text-(--text-muted) mb-8">
                Sua avaliação nos ajuda a melhorar cada dia mais. Conte como foi seu
                atendimento e inspire outras clientes!
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <FeedbackButton className="btn btn-primary w-full sm:w-auto sm:px-11! sm:py-[18px]!">
                  <IconChat size={18} /> Avaliar no Site
                </FeedbackButton>
                <a
                  href={GOOGLE_REVIEW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline w-full sm:w-auto sm:px-11! sm:py-[18px]!"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Avaliar no Google
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ===== AVALIAÇÕES ===== */}
        <section className="section section-alt reveal">
          <div className="container-x">
            <div className="text-center mb-12">
              <span className="section-subtitle">O que nossas clientes dizem</span>
              <h2 className="section-title">Avaliações Reais</h2>
            </div>
            <FeedbackList items={feedbacks} />
          </div>
        </section>

        {/* ===== PROGRAMA DE INDICACAO ===== */}
        <section className="py-[70px] reveal">
          <div className="container-x">
            <div className="lux-card rounded-[24px]! max-w-[700px] mx-auto text-center px-5 py-10 sm:px-8 sm:py-14">
              <span className="section-subtitle">Indique e Ganhe</span>
              <h2 className="font-heading text-2xl sm:text-3xl mt-2 mb-3">Programa de Indicação</h2>
              <p className="text-(--text-muted) mb-8">
                Indique a Nicbeautty para suas amigas e ambas ganham desconto no próximo atendimento!
              </p>
              <Link href="/indicar" className="btn btn-primary w-full sm:w-auto sm:px-11! sm:py-[18px]!">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Quero Indicar
              </Link>
            </div>
          </div>
        </section>

        {/* ===== BLOG PREVIEW ===== */}
        <section className="section section-alt reveal">
          <div className="container-x text-center">
            <span className="section-subtitle">Dicas & Tendências</span>
            <h2 className="section-title">Nosso Blog</h2>
            <p className="text-(--text-muted) max-w-lg mx-auto mb-10">
              Artigos sobre cuidados com cílios, técnicas de extensão e tudo sobre beleza.
            </p>
            <Link href="/blog" className="btn btn-outline">
              Ver Todos os Artigos
            </Link>
          </div>
        </section>

        {/* ===== CONTATO ===== */}
        <section id="contato" className="section reveal">
          <div className="container-x">
            <div className="lux-card rounded-[28px]! text-center px-5 py-10 sm:px-8 sm:py-14">
              <span className="section-subtitle">Atendimento Exclusivo</span>
              <h2 className="section-title">Agende seu horário ou tire suas dúvidas</h2>
              <p className="text-(--text-muted) max-w-lg mx-auto mb-12">
                Atendimentos com hora marcada para assegurar total dedicação e cuidado ao seu olhar.
              </p>

              <div className="grid grid-cols-1 min-[560px]:grid-cols-3 gap-4 md:gap-5 max-w-3xl mx-auto">
                <LinkWhatsapp origem="home_contato" className="lux-card p-6 flex flex-col items-center gap-3 hover:border-(--rose-gold)!">
                  <WhatsAppIcon size={28} />
                  <strong>WhatsApp Direct</strong>
                  <span className="text-xs text-(--text-muted)">Agendar atendimento</span>
                </LinkWhatsapp>
                <a href="https://instagram.com/nicbeautty" target="_blank" rel="noopener noreferrer" className="lux-card p-6 flex flex-col items-center gap-3 hover:border-(--rose-gold)!">
                  <InstagramIcon size={28} />
                  <strong>Instagram</strong>
                  <span className="text-xs text-(--text-muted)">@nicbeautty</span>
                </a>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lux-card p-6 flex flex-col items-center gap-3 hover:border-(--rose-gold)!"
                >
                  <GoogleMapsIcon size={26} />
                  <strong>Localização</strong>
                  <span className="text-xs text-(--text-muted) leading-snug">
                    {ENDERECO.rua}
                    <br />
                    {ENDERECO.bairro}
                  </span>
                  <span className="text-xs text-(--rose-gold)">Ver rota no Google Maps</span>
                </a>
              </div>

              <BookingButton className="btn btn-primary mt-10 sm:mt-12 w-full sm:w-auto sm:px-14!">
                Agendar pelo Site
              </BookingButton>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <FeedbackModal />
    </>
  );
}