import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Variáveis de ambiente do Supabase não encontradas.');
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function getUserFromRequest(req) {
  if (!supabase) return null;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { user, token };
}

export function getSupabaseForUser(token) {
  if (!supabaseUrl || !supabaseKey || !token) return null;
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

const toSnake = (c) => ({
  id:               c.id,
  world:            c.world,
  char_name:        c.charName,
  char_title:       c.charTitle,
  char_age:         c.charAge,
  char_bg:          c.charBg,
  char_personality: c.charPersonality,
  char_skills:      c.charSkills,
  appearance:       c.appearance,
  use_images:       c.useImages,
  is_known_ip:      c.isKnownIP,
  game_style:       c.gameStyle,
  world_bg:         c.worldBg,
  relationships:    c.relationships,
  lore:             c.lore,
  msgs:             c.msgs,
  disp:             c.disp,
  img:              c.img,
  hp:               c.hp,
  missions:         c.missions,
  items:            c.items,
  saves:            c.saves,
});

const toCamel = (r) => ({
  id:              r.id,
  world:           r.world,
  charName:        r.char_name,
  charTitle:       r.char_title,
  charAge:         r.char_age,
  charBg:          r.char_bg,
  charPersonality: r.char_personality,
  charSkills:      r.char_skills,
  appearance:      r.appearance,
  useImages:       r.use_images,
  isKnownIP:       r.is_known_ip,
  gameStyle:       r.game_style,
  worldBg:         r.world_bg,
  relationships:   r.relationships,
  lore:            r.lore,
  msgs:            r.msgs,
  disp:            r.disp,
  img:             r.img,
  hp:              r.hp,
  missions:        r.missions,
  items:           r.items,
  saves:           r.saves,
  createdAt:       r.created_at,
  updatedAt:       r.updated_at,
});

export function createRpgPersistence(db, userId) {
  return {
    async saveCampaign(campaign) {
      if (!db || !userId) return false;
      try {
        const row = {
          ...toSnake(campaign),
          user_id: userId,
          updated_at: new Date().toISOString(),
        };

        const { error } = await db.from('rpg_campaigns').upsert(row);
        if (error) {
          console.error('Erro ao salvar campanha:', error);
          return false;
        }

        await this.updateCampaignIndex(campaign);
        return true;
      } catch (err) {
        console.error('Erro ao salvar campanha:', err);
        return false;
      }
    },

    async loadCampaign(id) {
      if (!db || !userId) return null;
      try {
        const { data, error } = await db
          .from('rpg_campaigns')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .single();

        if (error) {
          console.error('Erro ao carregar campanha:', error);
          return null;
        }

        return toCamel(data);
      } catch (err) {
        console.error('Erro ao carregar campanha:', err);
        return null;
      }
    },

    async updateCampaignIndex(campaign) {
      if (!db || !userId) return;
      try {
        const { error } = await db.from('rpg_campaign_index').upsert({
          id:         campaign.id,
          user_id:    userId,
          world:      campaign.world,
          char_name:  campaign.charName,
          updated_at: new Date().toISOString(),
        });

        if (error) console.error('Erro ao atualizar índice:', error);
      } catch (err) {
        console.error('Erro ao atualizar índice:', err);
      }
    },

    async listCampaigns() {
      if (!db || !userId) return [];
      try {
        const { data, error } = await db
          .from('rpg_campaign_index')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('Erro ao listar campanhas:', error);
          return [];
        }

        return data.map((r) => ({
          id:        r.id,
          world:     r.world,
          charName:  r.char_name,
          updatedAt: r.updated_at,
          createdAt: r.created_at,
        }));
      } catch (err) {
        console.error('Erro ao listar campanhas:', err);
        return [];
      }
    },

    async deleteCampaign(id) {
      if (!db || !userId) return false;
      try {
        const { error: error1 } = await db
          .from('rpg_campaigns')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        const { error: error2 } = await db
          .from('rpg_campaign_index')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (error1 || error2) {
          console.error('Erro ao deletar campanha:', error1 || error2);
          return false;
        }

        return true;
      } catch (err) {
        console.error('Erro ao deletar campanha:', err);
        return false;
      }
    },
  };
}

// Legado — cooldowns de API keys (servidor)
export const keyManagement = {
  async cleanupExpiredCooldowns() {
    if (!supabase) return;
    try {
      const { error } = await supabase.rpc('cleanup_expired_cooldowns');
      if (error) console.error('Erro ao limpar cooldowns expirados:', error);
    } catch (err) {
      console.error('Erro na limpeza de cooldowns:', err);
    }
  },
};
