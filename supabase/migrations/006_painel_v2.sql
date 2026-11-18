-- ============================================================
-- NICBEAUTTY - PAINEL V2 (rodar UMA vez, depois do sql-seguranca.sql)
-- Supabase → SQL Editor → colar tudo → Run. Pode rodar de novo sem problema.
-- ============================================================

-- 1) CATÁLOGO: tempo em minutos, mostrar/esconder, destaque e ordem
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

-- 2) NOVIDADES (janela de promoções/eventos ao abrir o site)
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

-- 3) CONFERÊNCIA
select 'services' as tabela, count(*) as linhas from public.services
union all
select 'novidades', count(*) from public.novidades;
