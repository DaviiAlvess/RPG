-- Execute no SQL Editor do Supabase (Dashboard → SQL → New query)
-- Habilita contas: cada jogador vê só as próprias campanhas em qualquer dispositivo.

-- Tabela principal (histórico completo: msgs, disp, onde parou, etc.)
CREATE TABLE IF NOT EXISTS public.rpg_campaigns (
  id               TEXT PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  world            TEXT,
  char_name        TEXT,
  char_title       TEXT,
  char_age         TEXT,
  char_bg          TEXT,
  char_personality TEXT,
  char_skills      TEXT,
  appearance       JSONB DEFAULT '{}',
  use_images       BOOLEAN DEFAULT true,
  is_known_ip      BOOLEAN DEFAULT false,
  game_style       TEXT DEFAULT 'aventura',
  world_bg         TEXT,
  relationships    JSONB DEFAULT '{}',
  lore             TEXT,
  char_lore        TEXT,
  msgs             JSONB DEFAULT '[]',
  disp             JSONB DEFAULT '[]',
  img              TEXT,
  hp               INTEGER DEFAULT 100,
  missions         JSONB DEFAULT '[]',
  items            JSONB DEFAULT '[]',
  saves            JSONB DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Índice leve para listar campanhas na home
CREATE TABLE IF NOT EXISTS public.rpg_campaign_index (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  world       TEXT,
  char_name   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rpg_campaigns_user_id_idx ON public.rpg_campaigns(user_id);
CREATE INDEX IF NOT EXISTS rpg_campaign_index_user_id_idx ON public.rpg_campaign_index(user_id);

ALTER TABLE public.rpg_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rpg_campaign_index ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rpg_campaigns_select_own" ON public.rpg_campaigns;
DROP POLICY IF EXISTS "rpg_campaigns_insert_own" ON public.rpg_campaigns;
DROP POLICY IF EXISTS "rpg_campaigns_update_own" ON public.rpg_campaigns;
DROP POLICY IF EXISTS "rpg_campaigns_delete_own" ON public.rpg_campaigns;

CREATE POLICY "rpg_campaigns_select_own" ON public.rpg_campaigns
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rpg_campaigns_insert_own" ON public.rpg_campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rpg_campaigns_update_own" ON public.rpg_campaigns
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rpg_campaigns_delete_own" ON public.rpg_campaigns
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "rpg_index_select_own" ON public.rpg_campaign_index;
DROP POLICY IF EXISTS "rpg_index_insert_own" ON public.rpg_campaign_index;
DROP POLICY IF EXISTS "rpg_index_update_own" ON public.rpg_campaign_index;
DROP POLICY IF EXISTS "rpg_index_delete_own" ON public.rpg_campaign_index;

CREATE POLICY "rpg_index_select_own" ON public.rpg_campaign_index
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rpg_index_insert_own" ON public.rpg_campaign_index
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rpg_index_update_own" ON public.rpg_campaign_index
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rpg_index_delete_own" ON public.rpg_campaign_index
  FOR DELETE USING (auth.uid() = user_id);

-- Migração: adiciona lore do personagem (execute se a tabela já existir)
ALTER TABLE public.rpg_campaigns ADD COLUMN IF NOT EXISTS char_lore TEXT;
