import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PlanosSignup from "@/components/PlanosSignup";
import { IconCheck } from "@/components/icons";

export const metadata: Metadata = {
  title: "Planos VIP",
  description:
    "Assinatura mensal Nicbeautty com manutenções inclusas, designs de sobrancelha e prioridade total na agenda.",
  alternates: { canonical: "/planos" },
};

const BENEFICIOS = [
  ["Valor Mensal", ["R$ 180,00"], false],
  [
    "Incluso no plano",
    ["3 manutenções", "2 designs de sobrancelhas"],
    false,
  ],
  ["Técnicas Permitidas", ["Qualquer técnica do catálogo"], false],
  [
    "Benefícios",
    [
      "Prioridade na agenda e horários garantidos",
      "Manutenções sem preocupações",
      "Cílios sempre alinhados e preenchidos",
    ],
    false,
  ],
  ["Agendamento Prioritário", ["VIP Total"], true],
] as const;

export default function PlanosPage() {
  return (
    <>
      <Navbar />

      <header className="pt-[calc(env(safe-area-inset-top)+120px)] md:pt-[140px] pb-12 md:pb-16 text-center px-6" style={{ background: "var(--bg-secondary)" }}>
        <span className="section-subtitle">Assinaturas Exclusivas</span>
        <h1 className="section-title">O melhor plano para você</h1>
        <p className="text-(--text-muted) max-w-xl mx-auto">
          Mantenha seu olhar impecável o mês todo com vantagens e descontos exclusivos
          em nossos serviços.
        </p>
      </header>

      <main className="section pt-14!">
        <div className="container-x max-w-[560px] mx-auto">
          <div
            className="lux-card overflow-hidden rounded-[26px]!"
            style={{ boxShadow: "0 24px 60px rgba(216,163,125,0.18)" }}
          >
            {/* header do card */}
            <div
              className="relative text-center py-10 px-6"
              style={{
                background:
                  "linear-gradient(135deg, var(--rose-gold-dark) 0%, var(--rose-gold) 55%, var(--rose-gold-light) 100%)",
              }}
            >
              <div
                className="absolute top-4 right-[-42px] rotate-45 text-[11px] font-bold tracking-wider uppercase px-12 py-1"
                style={{ background: "#14100c", color: "#f0cbb0" }}
              >
                Mais Vantajoso
              </div>
              <h2 className="font-heading text-[1.7rem] md:text-4xl font-bold" style={{ color: "#14100c" }}>
                Plano Mensal
              </h2>
              <p className="text-sm mt-2 max-w-sm mx-auto" style={{ color: "#3a2a1c" }}>
                Para manter seus cílios sempre lindos, alinhados e preenchidos durante todo o mês!
              </p>
            </div>

            {/* corpo */}
            <div className="p-8! md:p-9! space-y-5">
              {BENEFICIOS.map(([label, valores, destaque]) => (
                <div key={label} className="flex gap-4 border-b border-(--border-color) pb-5 last:border-none last:pb-0">
                  <span className="text-sm font-semibold text-(--rose-gold) min-w-[110px] md:min-w-[130px] shrink-0">
                    {label}
                  </span>
                  <div className="space-y-1.5">
                    {(valores as readonly string[]).map((v) => (
                      <p key={v} className={destaque ? "text-(--rose-gold-light) font-bold text-lg" : "text-(--text-main)"}>
                        {destaque && <IconCheck size={16} className="inline-block -mt-1 mr-1.5" />}
                        {v}
                      </p>
                    ))}
                  </div>
                </div>
              ))}

              <PlanosSignup />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
