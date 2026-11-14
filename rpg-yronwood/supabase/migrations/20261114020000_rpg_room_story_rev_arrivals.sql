-- story_rev só muda quando a HISTÓRIA muda (jogada). Entrar, sair ou trocar retrato não atrapalha a jogada de quem está na vez.
alter table public.rpg_rooms
  add column story_rev integer not null default 1,
  -- Quem chegou, voltou ou saiu desde a última jogada (o Mestre narra na cena seguinte).
  add column arrivals jsonb not null default '[]'::jsonb;
alter table public.rpg_rooms
  add constraint rpg_rooms_arrivals_small_array check (jsonb_typeof(arrivals) = 'array' and jsonb_array_length(arrivals) <= 12);
