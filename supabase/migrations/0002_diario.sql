-- Diário: o resumo do dia é calculado dos dados; aqui só ficam os dois toques (humor e disposição).
create table if not exists public.porteiro_diary (
  dia        date        primary key,
  humor      smallint    check (humor between 1 and 5),
  energia    smallint    check (energia between 1 and 5),
  updated_at timestamptz not null default now()
);

alter table public.porteiro_diary enable row level security;
revoke all on public.porteiro_diary from anon, authenticated;

comment on table public.porteiro_diary is 'Porteiro: humor e disposição do dia (1 a 5), um toque cada. Só o backend (chave secreta) lê e escreve.';
