-- Personagens que o dono da sala oferece para os amigos escolherem ao entrar.
alter table public.rpg_rooms
  add column slots jsonb not null default '[]'::jsonb;
alter table public.rpg_rooms
  add constraint rpg_rooms_slots_is_small_array
  check (jsonb_typeof(slots) = 'array' and jsonb_array_length(slots) <= 12);

-- Papel do personagem de cada jogador no grupo (ex.: "lutador", "curandeira").
alter table public.rpg_room_members
  add column char_role text not null default '';
alter table public.rpg_room_members
  add constraint rpg_room_members_char_role_len check (char_length(char_role) <= 80);
