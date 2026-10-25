/*
 * Testes das regras do site (sem banco, sem internet).
 * Rodar: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatarDuracao, parseDuracaoMin, podeAlterarPeloSite, inicioDoAtendimento, duracaoDoServico } from "../src/lib/agenda.ts";
import { proximaRenovacao } from "../src/lib/planos.ts";
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
