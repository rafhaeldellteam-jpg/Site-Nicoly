-- ============================================================
-- NICBEAUTTY - SQL COMPLETO DAS MELHORIAS (segurança + painel v2)
-- Supabase → SQL Editor → New query → colar TUDO → Run.
-- Pode rodar mais de uma vez sem problema.
-- ============================================================

-- O site acessa o banco pelo servidor (chave service_role), que ignora
-- estas regras. Por isso podemos fechar o acesso público ao máximo:
-- o navegador só consegue LER o que é público (catálogo, avaliações
-- aprovadas, posts publicados, promoções ativas, galeria, equipe).

-- 1) MARKETING: remove as regras que liberavam tudo para qualquer pessoa
--    (só mexe nas tabelas que existirem)
do $$
begin
  if to_regclass('public.blog_posts') is not null then
    drop policy if exists "blog_admin_all"   on public.blog_posts;
    drop policy if exists "blog_public_read" on public.blog_posts;
    create policy "blog_public_read" on public.blog_posts
      for select to anon, authenticated using (publicado = true);
  end if;
  if to_regclass('public.promocoes') is not null then
    drop policy if exists "promo_admin_all"   on public.promocoes;
    drop policy if exists "promo_public_read" on public.promocoes;
    create policy "promo_public_read" on public.promocoes
      for select to anon, authenticated using (ativa = true);
  end if;
  if to_regclass('public.referrals') is not null then
    drop policy if exists "referral_public_insert" on public.referrals;
    drop policy if exists "referral_admin_read"    on public.referrals;
    drop policy if exists "referral_admin_all"     on public.referrals;
  end if;
  if to_regclass('public.newsletter') is not null then
    drop policy if exists "newsletter_public_insert" on public.newsletter;
    drop policy if exists "newsletter_admin_read"    on public.newsletter;
    drop policy if exists "newsletter_admin_all"     on public.newsletter;
  end if;
end $$;

-- 2) AGENDAMENTOS E AVALIAÇÕES: só o servidor grava
--    (antes dava para criar agendamento sem validação, ou uma avaliação
--     já "aprovada", direto pela API pública do Supabase)
drop policy if exists "publico envia feedback"  on public.feedbacks;
drop policy if exists "publico cria agendamento" on public.appointments;

-- 3) IMPEDE DOIS AGENDAMENTOS NO MESMO HORÁRIO (cliques simultâneos)
do $$
begin
  create unique index if not exists appointments_horario_unico
    on public.appointments (appointment_date, appointment_time)
    where coalesce(status, 'confirmado') <> 'cancelado';
exception when unique_violation then
  raise notice 'Já existem agendamentos duplicados no mesmo horário. Cancele os repetidos no painel e rode este bloco de novo.';
end $$;

-- 4) PLANO VIP: e-mail da cliente + novo status "pendente"
alter table if exists public.planos_assinaturas add column if not exists cliente_email text;
alter table if exists public.planos_assinaturas alter column status set default 'pendente';

-- 5) LIMITE DE TENTATIVAS (protege formulários contra spam/robôs)
create table if not exists public.rate_limits (
  chave      text primary key,
  contagem   integer not null default 0,
  expira_em  timestamptz not null
);
alter table public.rate_limits enable row level security;
-- sem policy: só o servidor acessa

create or replace function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contagem integer;
begin
  insert into public.rate_limits as r (chave, contagem, expira_em)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (chave) do update
    set contagem  = case when r.expira_em < now() then 1 else r.contagem + 1 end,
        expira_em = case when r.expira_em < now() then now() + make_interval(secs => p_window_seconds) else r.expira_em end
  returning contagem into v_contagem;

  -- limpeza ocasional de chaves vencidas
  if random() < 0.02 then
    delete from public.rate_limits where expira_em < now() - interval '1 day';
  end if;

  return v_contagem <= p_max;
end;
$$;

revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- ============================================================
-- PARTE 2: PAINEL V2 (catálogo + novidades)
-- ============================================================

-- 6) CATÁLOGO: tempo em minutos, mostrar/esconder, destaque e ordem
alter table public.services add column if not exists duracao_min integer;
alter table public.services add column if not exists ativo       boolean not null default true;
alter table public.services add column if not exists destaque    boolean not null default false;
alter table public.services add column if not exists ordem       integer;

-- mantém a faixa "Mais pedido" que antes era fixa no serviço de id 2
update public.services set destaque = true where id = 2 and destaque = false
  and not exists (select 1 from public.services where destaque = true and id <> 2);

-- ordem inicial = ordem atual do catálogo
update public.services s set ordem = sub.pos
from (select id, row_number() over (order by id) as pos from public.services) sub
where s.id = sub.id and s.ordem is null;

-- 7) NOVIDADES (janela de promoções/eventos ao abrir o site)
create table if not exists public.novidades (
  id               bigint generated always as identity primary key,
  titulo           text not null,
  chamada          text,
  descricao        text,
  imagem           text,
  tipo             text not null default 'novidade',  -- promocao | evento | novidade
  botao_acao       text not null default 'agendar',   -- agendar | whatsapp | link | nenhum
  botao_texto      text,
  botao_link       text,
  modo             text not null default 'sempre',    -- sempre | dias | data | periodo
  inicio           date,                              -- vazio = sem limite
  fim              date,
  abrir_automatico boolean not null default true,
  ativo            boolean not null default true,
  criado_em        timestamptz not null default now()
);
alter table public.novidades enable row level security;
-- sem policy: o site lê pelo servidor e só o painel grava

create index if not exists novidades_ativas on public.novidades (ativo, inicio, fim);

-- 8) CONFERÊNCIA FINAL
-- Mostra as regras que ainda permitem ESCRITA pública. O ideal é vir vazio;
-- se aparecer alguma linha, mande um print.
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname in ('public', 'storage')
  and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
order by schemaname, tablename;
