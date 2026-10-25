-- ============================================================
-- NICBEAUTTY - ADMINISTRADORAS DO PAINEL
-- Supabase → SQL Editor → New query → colar tudo → Run.
-- Pode rodar mais de uma vez sem problema.
--
-- Depois de rodar, quem entra no painel é controlado pela tabela
-- "administradores" (Table Editor → administradores):
--   • dar acesso ........ adicionar uma linha com o e-mail e ativo = true
--   • tirar acesso ...... mudar ativo para false (ou apagar a linha)
-- A pessoa também precisa ter conta em Authentication → Users
-- com esse mesmo e-mail para conseguir fazer login.
-- ============================================================

-- 1) TABELA
create table if not exists public.administradores (
  id         bigint generated always as identity primary key,
  email      text not null,
  nome       text,
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

-- e-mail sempre em minúsculas e sem repetir
create unique index if not exists administradores_email_unico on public.administradores (lower(email));

create or replace function public.administradores_normaliza_email()
returns trigger language plpgsql as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists administradores_normaliza_email on public.administradores;
create trigger administradores_normaliza_email
  before insert or update on public.administradores
  for each row execute function public.administradores_normaliza_email();

-- 2) SEGURANÇA: ninguém lê nem altera pelo navegador; só o servidor do site
alter table public.administradores enable row level security;
revoke all on public.administradores from anon, authenticated;

-- 3) ADMINISTRADORAS ATUAIS (as mesmas que já tinham acesso)
insert into public.administradores (email, nome) values
  ('phael.techsuporte@gmail.com',  'Phael Tech Support'),
  ('phael.techsuporte2@gmail.com', 'Phael Tech Support 2'),
  ('nicbeautty@gmail.com',         'Nicoly')
on conflict ((lower(email))) do nothing;

-- 4) CONFERÊNCIA: lista as administradoras e se cada uma já tem conta de login
select
  a.email,
  a.nome,
  a.ativo,
  case when u.id is null then 'falta criar a conta em Authentication → Users'
       else 'conta de login OK' end as situacao
from public.administradores a
left join auth.users u on lower(u.email) = a.email
order by a.ativo desc, a.email;
