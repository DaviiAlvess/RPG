-- Retrato e aparência do personagem de cada jogador (públicos para a mesa).
alter table public.rpg_room_members
  add column char_photo text not null default '',
  add column char_look text not null default '',
  -- Ficha privada do jogador (vida, nível, itens, Sistema...): só o próprio jogador recebe.
  add column sheet jsonb not null default '{}'::jsonb;
alter table public.rpg_room_members
  add constraint rpg_room_members_char_photo_len check (char_length(char_photo) <= 1500),
  add constraint rpg_room_members_char_look_len check (char_length(char_look) <= 200),
  add constraint rpg_room_members_sheet_is_object check (jsonb_typeof(sheet) = 'object');
