-- Salas online do RPG: campanha compartilhada + jogadores (cada um no seu celular).
-- Acesso SÓ pelo servidor do site (chave secreta), que confere o login Firebase de cada jogador.
create table public.rpg_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  owner_uid text not null check (length(owner_uid) between 1 and 128),
  title text not null default '' check (length(title) <= 160),
  campaign jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  turn_uid text,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rpg_room_members (
  room_id uuid not null references public.rpg_rooms (id) on delete cascade,
  uid text not null check (length(uid) between 1 and 128),
  char_name text not null check (length(char_name) between 1 and 60),
  char_concept text not null default '' check (length(char_concept) <= 200),
  seat integer not null,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (room_id, uid),
  unique (room_id, seat)
);

create index rpg_room_members_uid_idx on public.rpg_room_members (uid);
create index rpg_rooms_owner_idx on public.rpg_rooms (owner_uid);

-- RLS ligado e sem políticas: nenhuma chave pública (anon/authenticated) lê ou grava.
alter table public.rpg_rooms enable row level security;
alter table public.rpg_room_members enable row level security;
revoke all on table public.rpg_rooms, public.rpg_room_members from anon, authenticated;
grant select, insert, update, delete on table public.rpg_rooms, public.rpg_room_members to service_role;
