export interface Manutencao {
  valor: string;
  prazo: string;
}

export interface Service {
  id: number;
  nome: string;
  descricao: string | null;
  duracao: string | null;
  aplicacao: string | null;
  manutencao: Manutencao[] | null;
  imagem: string | null;
  textobotao: string | null;
  preco?: number | null;
  /** duração em minutos (usada para saber se o serviço cabe no horário) */
  duracao_min?: number | null;
  /** false = escondido do site */
  ativo?: boolean | null;
  /** mostra a faixa "Mais pedido" no catálogo */
  destaque?: boolean | null;
  ordem?: number | null;
}

export interface Feedback {
  id: number;
  nome: string;
  estrelas: number;
  comentario: string | null;
  imagens: string[] | null;
  instagram: string | null;
  aprovado: boolean | null;
  created_at: string | null;
}

export interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  service_id: number | null;
  appointment_date: string;
  appointment_time: string;
  status: string | null;
  created_at: string | null;
}

export interface GaleriaItem {
  id?: number;
  titulo: string;
  descricao: string | null;
  imagem: string;
  ordem: number | null;
  criado_em?: string | null;
}

export interface Funcionario {
  id?: number;
  nome: string;
  especialidade: string | null;
  bio: string | null;
  foto: string | null;
  ativo: boolean | null;
  ordem: number | null;
  criado_em?: string | null;
}

export interface Assinatura {
  id?: number;
  cliente_nome: string;
  cliente_whatsapp: string | null;
  cliente_email?: string | null;
  tecnica: string | null;
  valor_mensal: number | null;
  inicio: string | null;
  status: string | null;
  criado_em?: string | null;
}

export interface ClienteInfo {
  id: string;
  email: string;
  nome: string | null;
  telefone: string | null;
  provedor: string;
  criado_em: string;
}

export interface DashboardData {
  agendados_hoje: number;
  proximos_7_dias: number;
  total_clientes: number;
  avaliacoes_pendentes: number;
  assinaturas_ativas: number;
  concluidos_total: number;
  planos_pendentes: number;
  proximos: (Appointment & { servico_nome: string | null })[];
}

export interface BlogPost {
  id?: number;
  titulo: string;
  slug: string;
  resumo: string | null;
  conteudo: string;
  imagem: string | null;
  tags: string[] | null;
  publicado: boolean | null;
  criado_em?: string | null;
}

export interface Promocao {
  id?: number;
  titulo: string;
  descricao: string | null;
  imagem: string | null;
  cupom: string | null;
  desconto: string | null;
  validade: string | null;
  ativa: boolean | null;
  criado_em?: string | null;
}

export interface Referral {
  id?: number;
  code: string;
  referrer_name: string | null;
  referrer_whatsapp: string | null;
  referred_name: string | null;
  referred_whatsapp: string | null;
  status: string | null;
  criado_em?: string | null;
}

export interface Newsletter {
  id?: number;
  nome: string | null;
  contato: string;
  tipo: string | null;
  ativo: boolean | null;
  criado_em?: string | null;
}

export interface Novidade {
  id?: number;
  titulo: string;
  /** frase curta do botão "Saiba mais" que aparece ao abrir o site */
  chamada: string | null;
  descricao: string | null;
  imagem: string | null;
  /** promocao | evento | novidade */
  tipo: string | null;
  /** agendar | whatsapp | link | nenhum */
  botao_acao: string | null;
  botao_texto: string | null;
  botao_link: string | null;
  /** sempre | dias | data | periodo */
  modo: string | null;
  /** YYYY-MM-DD (vazio = sem limite) */
  inicio: string | null;
  fim: string | null;
  /** abre a janela sozinha ao entrar no site (senão só mostra o "Saiba mais") */
  abrir_automatico: boolean | null;
  ativo: boolean | null;
  criado_em?: string | null;
}
