# Nicbeautty — site e painel

Site da Nicbeautty Lash Designer: catálogo, agendamento online, Plano VIP, avaliações,
blog e um painel administrativo completo. No ar em **https://nicbeautty.vercel.app**.

**Tecnologias:** Next.js 16 (App Router, Server Actions) · React 19 · Tailwind 4 ·
Supabase (banco, login e fotos) · Vercel (hospedagem e rotina diária) · Gmail (e-mails) ·
Google Agenda · Cloudflare Turnstile (captcha).

## Como o código está organizado

```
src/
  app/                    páginas (cada pasta é um endereço do site)
    admin/                painel administrativo
    api/cron/lembretes/   rotina diária dos lembretes (Vercel Cron)
    api/email, api/rastrear
  components/             partes de tela do site
    admin/                painel: abas/ (uma por aba), ui.tsx (peças comuns), graficos.tsx
  lib/
    acoes/                AÇÕES DO SERVIDOR ("use server"), uma por assunto:
      publico.ts            catálogo, galeria, equipe, avaliações
      agenda.ts             horários livres, agendar, Meus horários (remarcar/cancelar)
      admin-agenda.ts       painel: agendamentos, bloqueios, histórico, início
      admin-site.ts         painel: catálogo, galeria, equipe, moderação
      admin-relatorios.ts   painel: financeiro e cliques no WhatsApp
      planos.ts             Plano VIP
      novidades.ts          janela de novidades
      marketing.ts          blog, promoções, newsletter, indicações
      configuracoes.ts      configurações (ex.: link do Google)
      acesso.ts             quem é administradora
    servidor.ts           utilidades só do servidor (upload, validação...)
    agenda.ts             regras da agenda (horários, duração, prazo de 24h)
    planos.ts, datas.ts, texto.ts   regras puras (cobertas por testes)
    admin-auth.ts         confere login e permissão de administradora
    emails.ts, gmail.ts, google-calendar.ts, captcha.ts, lembretes.ts
supabase/migrations/      SQL do banco, em ordem (001 → 008)
tests/                    testes das regras (npm test)
```

**Regra de segurança:** toda função de painel começa com `await requireAdmin()`, que
confere no servidor o login e a tabela `administradores`. O navegador nunca grava direto
no banco — só pelas ações do servidor.

## Rodando no computador

```bash
npm install
cp .env.example .env.local   # preencha os valores
npm run dev                  # http://localhost:3000
```

| Comando | O que faz |
|---|---|
| `npm run dev` | site em modo de desenvolvimento |
| `npm run build` | gera a versão de produção (a Vercel roda isso) |
| `npm run lint` | procura problemas no código |
| `npm run typecheck` | confere os tipos do TypeScript |
| `npm test` | testa as regras de agenda, plano, e-mail e telefone |
| `npm run check` | os três acima de uma vez (roda também no GitHub a cada envio) |

## Banco de dados (Supabase)

Rode os arquivos de `supabase/migrations/` **em ordem** no SQL Editor do Supabase.
Todos podem ser rodados de novo sem problema. Num banco que já está funcionando, só é
preciso rodar os que ainda não foram aplicados.

| Arquivo | O que cria |
|---|---|
| 001_schema_inicial | serviços, avaliações, agendamentos, bloqueios |
| 002_painel | preço, galeria, equipe, Planos VIP |
| 003_marketing | blog, promoções, indicações, newsletter |
| 004_cliques_whatsapp | registro de cliques no WhatsApp |
| 005_seguranca | fecha o acesso público, limite de tentativas, horário único |
| 006_painel_v2 | colunas novas do catálogo, janela de novidades |
| 007_administradores | tabela de quem acessa o painel |
| 008_agenda_financeiro | remarcar/cancelar, lembretes, financeiro, configurações |

**Dar ou tirar acesso ao painel:** Supabase → Table Editor → `administradores`
(a pessoa também precisa de conta em Authentication → Users com o mesmo e-mail).

## Variáveis de ambiente (Vercel → Settings → Environment Variables)

Veja `.env.example`. As obrigatórias são as do Supabase. As demais ligam recursos:
sem `GMAIL_*` não há e-mails, sem `GOOGLE_*` não há Google Agenda, sem `TURNSTILE_*`
o captcha fica desligado e sem `CRON_SECRET` a rotina de lembretes não roda.

## Rotina diária (lembretes)

`vercel.json` agenda `/api/cron/lembretes` para 12:00 UTC (**09h em Brasília**). Ela
envia o lembrete às clientes com horário no dia seguinte e o resumo da agenda para o
salão. No painel → Agendamentos há o botão **Enviar lembretes agora** para testar.

## Publicação

Cada envio para o GitHub gera uma prévia na Vercel. O que entra na branch `main` vai
para o ar em nicbeautty.vercel.app.
