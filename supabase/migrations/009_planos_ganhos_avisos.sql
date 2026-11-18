-- ============================================================
-- 009 - GANHOS DOS PLANOS E E-MAILS AUTOMÁTICOS DO VIP
-- Supabase → SQL Editor → New query → colar tudo → Run.
-- Pode rodar mais de uma vez sem problema.
-- ============================================================

-- 1) ASSINATURAS: data do cancelamento (para medir quanto tempo cada cliente ficou)
alter table public.planos_assinaturas add column if not exists cancelado_em date;

-- 2) MENSALIDADES PAGAS
--    Cada linha é uma mensalidade recebida. "referencia" é o 1º dia do ciclo
--    que ela paga (os ciclos têm 30 dias, contados a partir do início do plano).
create table if not exists public.planos_pagamentos (
  id            bigint generated always as identity primary key,
  assinatura_id bigint not null references public.planos_assinaturas(id) on delete cascade,
  referencia    date not null,
  valor         numeric(10,2) not null,
  pago_em       date not null default current_date,
  criado_em     timestamptz not null default now(),
  unique (assinatura_id, referencia)
);
alter table public.planos_pagamentos enable row level security;
revoke all on public.planos_pagamentos from anon, authenticated;
create index if not exists planos_pagamentos_pago_em on public.planos_pagamentos (pago_em);

-- 3) E-MAILS AUTOMÁTICOS JÁ ENVIADOS (para não mandar o mesmo aviso duas vezes)
create table if not exists public.planos_avisos (
  id            bigint generated always as identity primary key,
  assinatura_id bigint not null references public.planos_assinaturas(id) on delete cascade,
  tipo          text not null,
  chave         text not null,
  enviado_em    timestamptz not null default now(),
  unique (assinatura_id, tipo, chave)
);
alter table public.planos_avisos enable row level security;
revoke all on public.planos_avisos from anon, authenticated;

-- 4) HISTÓRICO INICIAL
--    Considera pagas as mensalidades dos planos ATIVOS desde o início até hoje,
--    para o painel já começar com os ganhos preenchidos. Depois disso cada
--    mensalidade é registrada no painel (botão "Registrar pagamento").
insert into public.planos_pagamentos (assinatura_id, referencia, valor, pago_em)
select a.id, ciclo::date, coalesce(a.valor_mensal, 180), ciclo::date
from public.planos_assinaturas a
cross join lateral generate_series(a.inicio, current_date, interval '30 days') as ciclo
where a.status = 'ativo' and a.inicio is not null
on conflict (assinatura_id, referencia) do nothing;

-- 5) CONFERÊNCIA
select
  (select count(*) from public.planos_assinaturas where status = 'ativo') as planos_ativos,
  (select count(*) from public.planos_pagamentos)                         as mensalidades_registradas,
  (select coalesce(sum(valor), 0) from public.planos_pagamentos)          as total_recebido_planos;
