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
  proximos: (Appointment & { servico_nome: string | null })[];
}
