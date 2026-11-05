-- Porteiro: eventos vindos dos Atalhos do iPhone + passes temporários liberados no webapp.
-- Só o backend (chave secreta) lê e escreve. RLS ligado e sem policy = anon/publishable não acessa nada.

create table if not exists public.events (
  id         bigint generated always as identity primary key,
  app        text        not null,
  kind       text        not null check (kind in ('open', 'close')),
  allowed    boolean,                       -- só em 'open': true = tinha passe, false = barrado na porta
  at         timestamptz not null default now()
);

create index if not exists events_at_idx     on public.events (at desc);
create index if not exists events_app_at_idx on public.events (app, at desc);

create table if not exists public.passes (
  id         bigint generated always as identity primary key,
  app        text        not null,
  intent     text        not null default '',
  minutes    int         not null check (minutes between 1 and 120),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists passes_app_exp_idx on public.passes (app, expires_at desc);

alter table public.events enable row level security;
alter table public.passes enable row level security;

-- reforço: os papéis públicos não têm nem permissão de tabela
revoke all on public.events, public.passes from anon, authenticated;
