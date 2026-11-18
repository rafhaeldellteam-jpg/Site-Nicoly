import { supabaseAdmin } from "@/lib/supabase";
import { hojeSP } from "@/lib/datas";
import { sendNicEmail } from "@/lib/gmail";
import { buildEmailDoPlano, type DadosEmailPlano } from "@/lib/emails";
import { VIP_MANUTENCOES, avisoDevido } from "@/lib/planos";
import { buscarAssinaturas, carregarPagamentos, montarResumos, type ResumoPlano } from "@/lib/planos-resumo";

/*
 * E-mails automáticos do Plano VIP, enviados pela rotina diária
 * (src/app/api/cron/lembretes):
 *   • renovação — quando faltam 5 dias ou menos para o plano renovar;
 *   • manutenção — quando a cliente não tem horário marcado e já passaram
 *     ~15 dias da última sessão (ou 3 dias do início do mês, se ainda não veio).
 * Cada aviso sai uma vez só (tabela planos_avisos). Sem essa tabela
 * (SQL 009 ainda não rodado) nada é enviado automaticamente, para não repetir.
 */

export function dadosDoEmail(r: ResumoPlano, mensagem?: string | null): DadosEmailPlano {
  return {
    nome: r.nome,
    tecnica: r.tecnica,
    valor: r.valor,
    diasRestantes: r.ciclo?.diasRestantes ?? 0,
    renovacao: r.ciclo?.renovacao ?? hojeSP(),
    progresso: r.ciclo?.progresso ?? 0,
    usadas: Math.min(r.usadasCiclo, VIP_MANUTENCOES),
    inclusas: VIP_MANUTENCOES,
    meses: r.meses,
    proxima: r.proxima,
    sugestao: r.sugestao,
    mensagem,
  };
}

export async function registrarAviso(assinaturaId: number, tipo: string, chave: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from("planos_avisos").insert({ assinatura_id: assinaturaId, tipo, chave });
  return !error;
}

export async function enviarAvisosDosPlanos(): Promise<{ enviados: number; falhas: number; semTabela: boolean }> {
  const hoje = hojeSP();
  const { data: jaEnviados, error } = await supabaseAdmin
    .from("planos_avisos")
    .select("assinatura_id, tipo, chave")
    .gte("enviado_em", new Date(Date.now() - 120 * 86400000).toISOString());
  if (error) return { enviados: 0, falhas: 0, semTabela: true };
  const feitos = new Set((jaEnviados ?? []).map((a) => `${a.assinatura_id}|${a.tipo}|${a.chave}`));

  const ativas = (await buscarAssinaturas()).filter((a) => a.status === "ativo" && a.cliente_email);
  const resumos = await montarResumos(ativas, await carregarPagamentos(), hoje);

  let enviados = 0;
  let falhas = 0;
  for (const r of resumos) {
    const aviso = avisoDevido(r, hoje);
    if (!aviso || feitos.has(`${r.id}|${aviso.tipo}|${aviso.chave}`)) continue;
    // grava antes de enviar: se algo falhar no meio, a cliente não recebe duas vezes
    if (!(await registrarAviso(r.id, aviso.tipo, aviso.chave))) continue;
    try {
      const { assunto, html } = buildEmailDoPlano(aviso.tipo, dadosDoEmail(r));
      await sendNicEmail(r.email!, assunto, html);
      enviados++;
    } catch (err) {
      falhas++;
      console.error("aviso do plano:", r.id, aviso.tipo, err);
      await supabaseAdmin
        .from("planos_avisos")
        .delete()
        .match({ assinatura_id: r.id, tipo: aviso.tipo, chave: aviso.chave });
    }
  }
  return { enviados, falhas, semTabela: false };
}
