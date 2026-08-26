import NewsletterForm from "@/components/NewsletterForm";

export default function Footer() {
  return (
    <footer className="border-t border-(--border-color) pt-10 pb-8" style={{ background: "var(--bg-secondary)" }}>
      <div className="container-x">
        <div className="max-w-md mx-auto mb-10">
          <NewsletterForm />
        </div>

        <p className="text-(--text-muted) text-sm text-center">
          &copy; {new Date().getFullYear()} Nicbeautty Lash Designer. Todos os direitos reservados.
        </p>

        <div className="mt-8 pt-8 border-t border-(--border-color) flex flex-col items-center gap-3">
          <span className="text-(--text-muted) text-xs uppercase tracking-[0.25em]">
            Desenvolvido por
          </span>
          <a
            href="https://wa.me/5511913347390?text=Ol%C3%A1%2C%20gostaria%20de%20um%20or%C3%A7amento%20para%20cria%C3%A7%C3%A3o%20de%20site!"
            target="_blank"
            rel="noopener noreferrer"
            title="Falar com Phael Tech Support no WhatsApp"
            className="group inline-block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/phael-logo.webp"
              alt="Phael Tech Support"
              width={720}
              height={480}
              loading="lazy"
              className="h-24 md:h-44 w-auto object-contain transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_22px_rgba(216,163,125,0.6)]"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}