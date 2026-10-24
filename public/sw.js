/* Service worker da Nicbeautty
 *
 * - Páginas: busca na rede primeiro; sem internet, usa a cópia salva ou a página /offline.
 * - Imagens, fontes, CSS e JS: usa a cópia salva e atualiza em segundo plano.
 * - Nunca guarda o painel admin, "Meus horários" ou chamadas de API (dados pessoais).
 * - Quando sai uma versão nova, o site mostra "Nova versão disponível" para a cliente.
 */

const VERSAO = "v2";
const CACHE_PAGINAS = `nic-paginas-${VERSAO}`;
const CACHE_ARQUIVOS = `nic-arquivos-${VERSAO}`;
const CACHES_ATUAIS = [CACHE_PAGINAS, CACHE_ARQUIVOS];
const LIMITE_ARQUIVOS = 80;

const PRE_CARREGAR = [
  "/",
  "/offline",
  "/catalogo",
  "/planos",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// rotas com dados pessoais: sempre direto da rede, nunca em cache
const PRIVADAS = ["/admin", "/meus-horarios", "/api/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_PAGINAS)
      .then((cache) => Promise.allSettled(PRE_CARREGAR.map((url) => cache.add(url))))
  );
  // não chama skipWaiting aqui: a página pergunta antes de trocar de versão
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !CACHES_ATUAIS.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "ATUALIZAR") self.skipWaiting();
});

async function limitarCache(nome, max) {
  const cache = await caches.open(nome);
  const chaves = await cache.keys();
  for (let i = 0; i < chaves.length - max; i++) await cache.delete(chaves[i]);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (PRIVADAS.some((p) => url.pathname.startsWith(p))) return;
  // requisições internas de navegação do Next (React Server Components)
  if (url.searchParams.has("_rsc") || req.headers.get("RSC")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(CACHE_PAGINAS).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("/offline")) || caches.match("/"))
    );
    return;
  }

  const tipos = ["image", "style", "script", "font"];
  if (!tipos.includes(req.destination)) return;

  event.respondWith(
    caches.open(CACHE_ARQUIVOS).then(async (cache) => {
      const salvo = await cache.match(req);
      const daRede = fetch(req)
        .then((res) => {
          if (res.ok) {
            cache.put(req, res.clone());
            limitarCache(CACHE_ARQUIVOS, LIMITE_ARQUIVOS);
          }
          return res;
        })
        .catch(() => salvo);
      return salvo || daRede;
    })
  );
});
