-- Notificação no celular quando o passe acaba.

-- Aparelhos inscritos no web push (o PWA da tela de início do iPhone).
create table if not exists public.porteiro_push_subs (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.porteiro_push_subs enable row level security;
revoke all on public.porteiro_push_subs from anon, authenticated;

-- Cada passe avisa uma vez só.
alter table public.porteiro_passes add column if not exists notified_at timestamptz;

-- O cron chama o app a cada minuto. O segredo fica em privado.config, igual aos lembretes do outro app.
create or replace function privado.chamar_porteiro_passes()
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform net.http_post(
    url := 'https://distract-quota.vercel.app/api/cron/passes',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select v from privado.config where k = 'porteiro_cron_secret')),
    body := '{}'::jsonb
  );
end $$;
revoke all on function privado.chamar_porteiro_passes() from public, anon, authenticated;

select cron.schedule('porteiro-passes', '* * * * *', 'select privado.chamar_porteiro_passes()');
