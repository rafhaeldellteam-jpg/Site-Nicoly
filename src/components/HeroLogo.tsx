import Image from "next/image";

/**
 * Logo do topo da página com animação:
 * entrada suave, anel rose gold girando, brilho pulsando,
 * leve flutuação e brilhos orbitando ao redor.
 * Tudo em CSS (globals.css → "LOGO ANIMADA") e desligado para quem
 * pede menos movimento no sistema.
 */
export default function HeroLogo({ src }: { src: string }) {
  return (
    <div className="hero-logo mx-auto">
      <div className="hero-logo-float">
        <span className="hero-logo-glow" aria-hidden="true" />
        <span className="hero-logo-ring" aria-hidden="true" />
        <span className="hero-logo-orbit" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <Image
          src={src}
          alt="Nicoly, lash designer da Nicbeautty"
          width={320}
          height={320}
          priority
          sizes="(max-width: 768px) 200px, 300px"
          className="hero-logo-img"
        />
      </div>
    </div>
  );
}
