/** Endereço do estúdio — muda aqui e vale para o site inteiro, o Google e os e-mails. */

export const ENDERECO = {
  rua: "R. Daisy Bárbara da Silva, 143",
  bairro: "Jardim Paulistano (Zona Norte)",
  cidade: "São Paulo",
  uf: "SP",
  // coordenadas do ponto do Street View enviado pela Nicoly
  lat: -23.4602148,
  lng: -46.7141026,
} as const;

export const ENDERECO_LINHA = `${ENDERECO.rua} - ${ENDERECO.bairro}, ${ENDERECO.cidade} - ${ENDERECO.uf}`;

/**
 * Abre o endereço no Google Maps (app no celular, site no computador),
 * com o pino no local e o botão "Rotas".
 */
export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${ENDERECO.rua}, Jardim Paulistano, ${ENDERECO.cidade} - ${ENDERECO.uf}`
)}`;
