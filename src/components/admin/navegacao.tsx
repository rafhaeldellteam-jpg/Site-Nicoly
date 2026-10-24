import type { ReactNode } from "react";

export type Aba =
  | "dashboard"
  | "agendamentos"
  | "bloqueios"
  | "historico"
  | "planos"
  | "clientes"
  | "avaliacoes"
  | "catalogo"
  | "galeria"
  | "funcionarios"
  | "novidades"
  | "marketing";

export interface ItemMenu {
  id: Aba;
  rotulo: string;
  titulo: string;
  subtitulo: string;
  icone: ReactNode;
}

const i = {
  painel: (
    <>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </>
  ),
  agenda: (
    <>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  bloqueio: (
    <>
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="m9 14 6 6" />
      <path d="m15 14-6 6" />
    </>
  ),
  historico: (
    <>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </>
  ),
  cartao: (
    <>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </>
  ),
  pessoas: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </>
  ),
  estrela: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  livro: <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />,
  imagem: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </>
  ),
  equipe: (
    <>
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </>
  ),
  megafone: (
    <>
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </>
  ),
  brilho: (
    <>
      <path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
    </>
  ),
};

export const GRUPOS: { titulo: string; itens: ItemMenu[] }[] = [
  {
    titulo: "Agenda",
    itens: [
      { id: "dashboard", rotulo: "Início", titulo: "Início", subtitulo: "Resumo do dia e próximos atendimentos", icone: i.painel },
      { id: "agendamentos", rotulo: "Agendamentos", titulo: "Agendamentos", subtitulo: "Horários marcados pelas clientes", icone: i.agenda },
      { id: "bloqueios", rotulo: "Bloqueios", titulo: "Bloqueios", subtitulo: "Feche dias, horários ou períodos (férias)", icone: i.bloqueio },
      { id: "historico", rotulo: "Histórico", titulo: "Histórico", subtitulo: "Atendimentos passados e cancelados", icone: i.historico },
    ],
  },
  {
    titulo: "Clientes",
    itens: [
      { id: "planos", rotulo: "Planos VIP", titulo: "Planos VIP", subtitulo: "Assinaturas mensais das clientes", icone: i.cartao },
      { id: "clientes", rotulo: "Clientes", titulo: "Clientes", subtitulo: "Contas criadas no site e no Google", icone: i.pessoas },
      { id: "avaliacoes", rotulo: "Avaliações", titulo: "Avaliações", subtitulo: "Aprove o que aparece na página inicial", icone: i.estrela },
    ],
  },
  {
    titulo: "Site",
    itens: [
      { id: "catalogo", rotulo: "Catálogo", titulo: "Catálogo de serviços", subtitulo: "Cadastre serviços, preços, fotos e tempos", icone: i.livro },
      { id: "novidades", rotulo: "Novidades", titulo: "Novidades", subtitulo: "Janela de promoções e eventos ao abrir o site", icone: i.brilho },
      { id: "galeria", rotulo: "Galeria", titulo: "Galeria", subtitulo: "Fotos exibidas na página inicial", icone: i.imagem },
      { id: "funcionarios", rotulo: "Equipe", titulo: "Equipe", subtitulo: "Profissionais apresentadas no site", icone: i.equipe },
      { id: "marketing", rotulo: "Marketing", titulo: "Marketing", subtitulo: "Blog, promoções, newsletter e indicações", icone: i.megafone },
    ],
  },
];

export const MENU: ItemMenu[] = GRUPOS.flatMap((g) => g.itens);

/** Atalhos da barra inferior no celular (o último botão abre o menu completo). */
export const ATALHOS_CELULAR: Aba[] = ["dashboard", "agendamentos", "catalogo", "novidades"];

export function IconeMenu({ children, size = 19 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
