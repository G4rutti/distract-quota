-- De onde veio o evento: iphone (Atalhos) ou chrome (extensão). Antigos ficam como iphone.
alter table public.porteiro_events
  add column if not exists source text not null default 'iphone' check (source in ('iphone', 'chrome'));

comment on column public.porteiro_events.source is 'De onde veio o evento: iphone (Atalhos) ou chrome (extensão).';
