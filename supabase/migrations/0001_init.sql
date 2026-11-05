-- Porteiro: eventos vindos dos Atalhos do iPhone + passes temporários liberados no webapp.
-- Só o backend (chave secreta) lê e escreve. RLS ligado e sem policy = anon/publishable não acessa nada.

create table if not exists public.porteiro_events (
  id         bigint generated always as identity primary key,
  app        text        not null,
  kind       text        not null check (kind in ('open', 'close')),
  allowed    boolean,                       -- só em 'open': true = tinha passe, false = barrado na porta
  at         timestamptz not null default now()
);

create index if not exists porteiro_events_at_idx     on public.porteiro_events (at desc);
create index if not exists porteiro_events_app_at_idx on public.porteiro_events (app, at desc);

create table if not exists public.porteiro_passes (
  id         bigint generated always as identity primary key,
  app        text        not null,
  intent     text        not null default '',
  minutes    int         not null check (minutes between 1 and 120),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists porteiro_passes_app_exp_idx on public.porteiro_passes (app, expires_at desc);

alter table public.porteiro_events enable row level security;
alter table public.porteiro_passes enable row level security;

-- reforço: os papéis públicos não têm nem permissão de tabela
revoke all on public.porteiro_events, public.porteiro_passes from anon, authenticated;
