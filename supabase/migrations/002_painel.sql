-- =====================================================================
-- PAINEL ADMIN NICBEAUTTY - rode tudo de uma vez no SQL Editor
-- Projeto: jfqfbpjimozevtjscbej.supabase.co
-- =====================================================================

-- 1) PRECO no catalogo -------------------------------------------------
alter table public.services add column if not exists preco numeric(10,2);

update public.services set preco = 110 where nome ilike '%fio a fio%'          and preco is null;
update public.services set preco = 130 where nome ilike '%volume brasileiro%' and preco is null;
update public.services set preco = 140 where nome ilike '%marrom%'            and preco is null;
update public.services set preco = 140 where nome ilike '%5d%'                and preco is null;
update public.services set preco = 150 where nome ilike '%egipcio%' or nome ilike '%egípcio%' and preco is null;
update public.services set preco = 150 where nome ilike '%fox%'               and preco is null;
update public.services set preco = 180 where nome ilike '%luxo%'              and preco is null;
update public.services set preco = 30  where nome ilike '%simples%'           and preco is null;
update public.services set preco = 45  where nome ilike '%henna%'             and preco is null;

-- 2) GALERIA ------------------------------------------------------------
create table if not exists public.galeria (
  id        bigint generated always as identity primary key,
  titulo    text not null,
  descricao text,
  imagem    text not null,
  ordem     int default 0,
  criado_em timestamptz default now()
);
alter table public.galeria enable row level security;
drop policy if exists "galeria leitura publica" on public.galeria;
create policy "galeria leitura publica" on public.galeria
  for select to anon, authenticated using (true);

insert into public.galeria (titulo, descricao, imagem, ordem)
select 'Volume Brasileiro', 'Fios em Y com excelente retencao', s.imagem, 1
from public.services s
where s.imagem like '%volume_brasileiro_mais_claro%' limit 1
on conflict do nothing;

insert into public.galeria (titulo, descricao, imagem, ordem)
select 'Efeito Fox Eye', 'Olhar alongado e elegante', s.imagem, 2
from public.services s
where s.imagem like '%efeito_fox%' limit 1
on conflict do nothing;

insert into public.galeria (titulo, descricao, imagem, ordem)
select 'Egipicio', 'Preenchimento intenso com fios cruzados', s.imagem, 3
from public.services s
where s.imagem like '%Egipicio%' limit 1
on conflict do nothing;

-- 3) FUNCIONARIOS --------------------------------------------------------
create table if not exists public.funcionarios (
  id           bigint generated always as identity primary key,
  nome         text not null,
  especialidade text,
  bio          text,
  foto         text,
  ativo        boolean default true,
  ordem        int default 0,
  criado_em    timestamptz default now()
);
alter table public.funcionarios enable row level security;
drop policy if exists "funcionarios leitura publica" on public.funcionarios;
create policy "funcionarios leitura publica" on public.funcionarios
  for select to anon, authenticated using (true);

insert into public.funcionarios (nome, especialidade, bio, ativo, ordem)
values ('Nicoly', 'Lash Designer Specialist',
        'Especialista em extensoes de cilios com tecnicas exclusivas e atendimento VIP.', true, 1)
on conflict do nothing;

-- 4) ASSINATURAS DE PLANO VIP ---------------------------------------------
create table if not exists public.planos_assinaturas (
  id               bigint generated always as identity primary key,
  cliente_nome     text not null,
  cliente_whatsapp text,
  tecnica          text,
  valor_mensal     numeric(10,2) default 180,
  inicio           date default current_date,
  status           text default 'ativo',
  criado_em        timestamptz default now()
);
alter table public.planos_assinaturas enable row level security;
-- sem policy publica: acesso somente via service role (painel)

-- 5) LEITURA PUBLICA DOS BUCKETS NOVOS -------------------------------------
create policy "storage galeria ler" on storage.objects
  for select using (bucket_id = 'galeria');
create policy "storage funcionarios ler" on storage.objects
  for select using (bucket_id = 'funcionarios');
