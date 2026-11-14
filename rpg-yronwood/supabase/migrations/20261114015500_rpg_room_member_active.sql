-- Quem saiu da mesa continua guardado (personagem e ficha) e pode voltar; a vez pula quem está fora.
alter table public.rpg_room_members
  add column active boolean not null default true,
  add column left_at timestamptz;
