/*
 * Testes das regras do site (sem banco, sem internet).
 * Rodar: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatarDuracao, parseDuracaoMin, podeAlterarPeloSite, inicioDoAtendimento, duracaoDoServico } from "../src/lib/agenda.ts";
import { avisoDevido, cicloAtual, proximaRenovacao, sugestaoManutencao } from "../src/lib/planos.ts";
import { escaparLike, validarEmail, validarTelefone } from "../src/lib/texto.ts";

test("lê a duração escrita no catálogo", () => {
  assert.equal(parseDuracaoMin("2h"), 120);
  assert.equal(parseDuracaoMin("2h30"), 150);
  assert.equal(parseDuracaoMin("2:30h"), 150);
  assert.equal(parseDuracaoMin("1h 30min"), 90);
  assert.equal(parseDuracaoMin("90 min"), 90);
  assert.equal(parseDuracaoMin("2h a 3h"), 180, "intervalo usa o maior tempo");
  assert.equal(parseDuracaoMin(""), null);
  assert.equal(parseDuracaoMin(null), null);
});

test("duração cadastrada em minutos tem prioridade sobre o texto", () => {
  assert.equal(duracaoDoServico({ duracao_min: 45, duracao: "2h" }), 45);
  assert.equal(duracaoDoServico({ duracao: "2h30" }), 150);
  assert.equal(duracaoDoServico(null), 60);
});

test("formata a duração para exibir", () => {
  assert.equal(formatarDuracao(60), "1h");
  assert.equal(formatarDuracao(150), "2h30");
  assert.equal(formatarDuracao(45), "45 min");
});

test("remarcar/cancelar só até 24h antes", () => {
  const inicio = inicioDoAtendimento("2026-11-10", "14:00");
  assert.equal(podeAlterarPeloSite("2026-11-10", "14:00", inicio - 25 * 3600000), true);
  assert.equal(podeAlterarPeloSite("2026-11-10", "14:00", inicio - 23 * 3600000), false);
});

test("horário do atendimento é no fuso de São Paulo", () => {
  assert.equal(new Date(inicioDoAtendimento("2026-11-10", "09:00")).toISOString(), "2026-11-10T12:00:00.000Z");
});

test("renovação do Plano VIP a cada 30 dias", () => {
  const hoje = new Date("2026-10-25T12:00:00");
  const r = proximaRenovacao("2026-10-01", hoje);
  assert.equal(r.diasRestantes, 6);
  assert.equal(r.ciclo, 0);
  const r2 = proximaRenovacao("2026-08-01", hoje);
  assert.ok(r2.diasRestantes >= 0 && r2.diasRestantes <= 30);
  assert.equal(r2.ciclo, 2);
});

test("busca por e-mail não aceita curingas (Meus horários)", () => {
  assert.equal(escaparLike("maria_s@gmail.com"), "maria\\_s@gmail.com");
  assert.equal(escaparLike("%@gmail.com"), "\\%@gmail.com");
  assert.equal(escaparLike("ana@gmail.com"), "ana@gmail.com");
});

test("valida telefone e e-mail", () => {
  assert.ok(validarTelefone("(11) 99999-9999"));
  assert.ok(validarTelefone("11999999999"));
  assert.ok(!validarTelefone("123"));
  assert.ok(validarEmail("cliente@gmail.com"));
  assert.ok(!validarEmail("cliente@"));
});

/* ===== Plano VIP: ciclo, manutenção e avisos automáticos ===== */

test("ciclo do VIP: 30 dias a partir do início", () => {
  const c = cicloAtual("2026-10-01", "2026-10-11");
  assert.equal(c.numero, 0);
  assert.equal(c.inicio, "2026-10-01");
  assert.equal(c.renovacao, "2026-10-31");
  assert.equal(c.diasRestantes, 20);
  assert.ok(Math.abs(c.progresso - 1 / 3) < 0.01);

  const c2 = cicloAtual("2026-10-01", "2026-11-05");
  assert.equal(c2.numero, 1);
  assert.equal(c2.inicio, "2026-10-31");
  assert.equal(c2.renovacao, "2026-11-30");

  // no dia da renovação já começa o ciclo novo
  const c3 = cicloAtual("2026-10-01", "2026-10-31");
  assert.equal(c3.numero, 1);
  assert.equal(c3.diasRestantes, 30);
});

test("sugere a manutenção 15 dias depois da última sessão", () => {
  assert.equal(sugestaoManutencao("2026-11-01", "2026-11-05"), "2026-11-16");
  assert.equal(sugestaoManutencao("2026-10-01", "2026-11-05"), "2026-11-05", "atrasada = hoje");
  assert.equal(sugestaoManutencao(null, "2026-11-05"), "2026-11-05");
});

test("avisos automáticos do VIP", () => {
  const base = { status: "ativo", email: "ana@x.com", usadasCiclo: 1, proxima: null, ultima: { data: "2026-11-10" } };
  // faltam 3 dias para renovar → aviso de renovação
  const perto = { ...base, ciclo: cicloAtual("2026-10-20", "2026-11-16") };
  assert.deepEqual(avisoDevido(perto, "2026-11-16"), { tipo: "renovacao", chave: "2026-11-19" });
  // 15 dias sem vir e sem horário → hora da manutenção
  const ciclo = cicloAtual("2026-11-01", "2026-11-25");
  assert.deepEqual(avisoDevido({ ...base, ciclo }, "2026-11-25"), { tipo: "manutencao", chave: "2026-11-10" });
  // com horário marcado não manda nada
  assert.equal(avisoDevido({ ...base, ciclo, proxima: { data: "2026-11-28" } }, "2026-11-25"), null);
  // sem e-mail ou plano pausado não manda nada
  assert.equal(avisoDevido({ ...base, ciclo, email: null }, "2026-11-25"), null);
  assert.equal(avisoDevido({ ...base, ciclo, status: "pausado" }, "2026-11-25"), null);
});
