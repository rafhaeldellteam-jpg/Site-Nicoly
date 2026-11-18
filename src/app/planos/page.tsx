import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PlanosEscolha from "@/components/PlanosEscolha";
import { getServices } from "@/lib/acoes/publico";

export const metadata: Metadata = {
  title: "Planos VIP",
  description:
    "Compare o Plano VIP Nicbeautty com o atendimento avulso: manutenções inclusas, designs de sobrancelha e prioridade total na agenda.",
  alternates: { canonical: "/planos" },
};

export const revalidate = 120;

/** "R$ 70,00" → 70 */
function valorEmReais(txt: string | null | undefined): number | null {
  const m = String(txt ?? "").match(/(\d{1,4}(?:\.\d{3})*(?:,\d{1,2})?)/);
  if (!m) return null;
  const n = Number(m[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default async function PlanosPage() {
  const servicos = await getServices();

  // números reais do catálogo para a comparação com o atendimento avulso
  const manutencoes = servicos
    .flatMap((s) => s.manutencao ?? [])
    .map((m) => valorEmReais(m.valor))
    .filter((n): n is number => n !== null);
  const manutencaoMin = manutencoes.length ? Math.min(...manutencoes) : null;
  const design = servicos.find((s) => /design/i.test(s.nome) && s.preco != null);
  const designPreco = design?.preco != null ? Number(design.preco) : null;
  const tecnicas = servicos.filter((s) => !/design/i.test(s.nome)).map((s) => s.nome);

  return (
    <>
      <Navbar />

      <header
        className="pt-[calc(env(safe-area-inset-top)+108px)] md:pt-[136px] pb-8 md:pb-12 text-center px-5"
        style={{ background: "radial-gradient(ellipse at top, rgba(216,163,125,0.16), transparent 70%), var(--bg-secondary)" }}
      >
        <span className="section-subtitle">Planos Nicbeautty</span>
        <h1 className="section-title">Escolha o melhor plano para você</h1>
        <p className="text-(--text-muted) max-w-xl mx-auto">
          Compare e veja como o Plano VIP mantém seu olhar impecável o mês todo, com manutenções inclusas e
          prioridade na agenda.
        </p>
      </header>

      <main className="section pt-8! md:pt-12!">
        <div className="container-x">
          <PlanosEscolha tecnicas={tecnicas} manutencaoMin={manutencaoMin} designPreco={designPreco} />
        </div>
      </main>

      <Footer />
    </>
  );
}
