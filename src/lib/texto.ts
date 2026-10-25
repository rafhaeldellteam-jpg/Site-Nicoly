/** Validações e ajustes de texto sem dependências (testados em tests/). */

export function validarTelefone(tel: string): boolean {
  return /^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/.test(tel.trim());
}

export function validarEmail(email: string): boolean {
  return email.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Escapa os curingas do ILIKE (% e _), para a busca por e-mail achar só
 * aquele e-mail exato (sem diferenciar maiúsculas).
 */
export function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}
