import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Variáveis de ambiente do Supabase não encontradas. Usando apenas localStorage.');
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ── Conversores camelCase <-> snake_case ───────────────────────────────
// Frontend usa camelCase, banco usa snake_case.
// Mapeamento explícito para evitar surpresas com campos JSONB e nomes especiais.

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

// ── Gerenciamento de chaves API ────────────────────────────────────────
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

  async getCooldowns() {
    if (!supabase) return {};
    try {
      const { data, error } = await supabase
        .from('api_key_cooldowns')
        .select('key_index, cooldown_until');

      if (error) {
        console.error('Erro ao obter cooldowns:', error);
        return {};
      }

      const cooldowns = {};
      const now = new Date();
      data.forEach(item => {
        const cooldownTime = new Date(item.cooldown_until);
        if (cooldownTime > now) {
          cooldowns[item.key_index] = cooldownTime.getTime();
        }
      });

      return cooldowns;
    } catch (err) {
      console.error('Erro ao buscar cooldowns:', err);
      return {};
    }
  },

  async addCooldown(keyIndex, cooldownMs = 60000) {
    if (!supabase) return;
    try {
      const cooldownUntil = new Date(Date.now() + cooldownMs).toISOString();
      const { error } = await supabase
        .from('api_key_cooldowns')
        .upsert({
          key_index: keyIndex,
          cooldown_until: cooldownUntil,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key_index' });

      if (error) console.error('Erro ao adicionar cooldown:', error);
    } catch (err) {
      console.error('Erro ao adicionar cooldown:', err);
    }
  },

  async removeCooldown(keyIndex) {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('api_key_cooldowns')
        .delete()
        .eq('key_index', keyIndex);

      if (error) console.error('Erro ao remover cooldown:', error);
    } catch (err) {
      console.error('Erro ao remover cooldown:', err);
    }
  }
};

// ── Persistência do RPG ────────────────────────────────────────────────
export const rpgPersistence = {
  async saveCampaign(campaign) {
    if (!supabase) return false;
    try {
      // FIX: converte camelCase → snake_case antes de enviar ao Supabase
      const row = {
        ...toSnake(campaign),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('rpg_campaigns')
        .upsert(row);

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
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('rpg_campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao carregar campanha:', error);
        return null;
      }

      // FIX: converte snake_case → camelCase antes de devolver ao frontend
      return toCamel(data);
    } catch (err) {
      console.error('Erro ao carregar campanha:', err);
      return null;
    }
  },

  async updateCampaignIndex(campaign) {
    if (!supabase) return;
    try {
      // FIX: usava campaign.char_name (snake) mas o objeto vem em camelCase
      const { error } = await supabase
        .from('rpg_campaign_index')
        .upsert({
          id:         campaign.id,
          world:      campaign.world,
          char_name:  campaign.charName,  // ← corrigido
          updated_at: new Date().toISOString(),
        });

      if (error) console.error('Erro ao atualizar índice:', error);
    } catch (err) {
      console.error('Erro ao atualizar índice:', err);
    }
  },

  async listCampaigns() {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('rpg_campaign_index')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Erro ao listar campanhas:', error);
        return [];
      }

      // Converte índice também para manter consistência no frontend
      return data.map(r => ({
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
    if (!supabase) return false;
    try {
      const { error: error1 } = await supabase
        .from('rpg_campaigns')
        .delete()
        .eq('id', id);

      const { error: error2 } = await supabase
        .from('rpg_campaign_index')
        .delete()
        .eq('id', id);

      if (error1 || error2) {
        console.error('Erro ao deletar campanha:', error1 || error2);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Erro ao deletar campanha:', err);
      return false;
    }
  }
};
