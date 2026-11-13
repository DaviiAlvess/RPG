-- Saves de cada jogador (segunda nuvem do RPG).
-- O navegador nunca acessa esta tabela: só o servidor do jogo (/api/saves), com a chave secreta,
-- depois de conferir o login do Firebase. Cada pedido é filtrado pelo uid verificado.
create table public.rpg_user_saves (
  uid text not null check (char_length(uid) between 1 and 128),
  campaign_id text not null check (char_length(campaign_id) between 1 and 200),
  world text not null default '' check (char_length(world) <= 200),
  char_name text not null default '' check (char_length(char_name) <= 120),
  data jsonb not null,
  data_bytes integer not null default 0 check (data_bytes >= 0),
  client_updated_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (uid, campaign_id)
);

comment on table public.rpg_user_saves is 'Campanhas salvas de cada jogador; acesso só pelo servidor (service_role), sempre filtrado pelo uid do token verificado.';

alter table public.rpg_user_saves enable row level security;

revoke all on table public.rpg_user_saves from anon, authenticated;
grant select, insert, update, delete on table public.rpg_user_saves to service_role;
