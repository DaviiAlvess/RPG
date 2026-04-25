import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Variáveis de ambiente do Supabase não encontradas. Usando apenas localStorage.');
}

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Funções para gerenciamento de chaves API
export const keyManagement = {
  // Limpar cooldowns expirados
  async cleanupExpiredCooldowns() {
    if (!supabase) return;
    
    try {
      const { error } = await supabase.rpc('cleanup_expired_cooldowns');
      if (error) console.error('Erro ao limpar cooldowns expirados:', error);
    } catch (err) {
      console.error('Erro na limpeza de cooldowns:', err);
    }
  },

  // Obter chaves em cooldown
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

  // Adicionar chave em cooldown
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
        }, { onConflict: 'key_index' }); // <--- ESSA LINHA É A MÁGICA
      
      if (error) console.error('Erro ao adicionar cooldown:', error);
    } catch (err) {
      console.error('Erro ao adicionar cooldown:', err);
    }
  },

  // Remover chave do cooldown
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

// Funções para persistência do RPG
export const rpgPersistence = {
  // Salvar campanha
  async saveCampaign(campaign) {
    if (!supabase) return false;
    
    try {
      const { error } = await supabase
        .from('rpg_campaigns')
        .upsert({
          ...campaign,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Erro ao salvar campanha:', error);
        return false;
      }
      
      // Atualizar índice
      await this.updateCampaignIndex(campaign);
      
      return true;
    } catch (err) {
      console.error('Erro ao salvar campanha:', err);
      return false;
    }
  },

  // Carregar campanha
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
      
      return data;
    } catch (err) {
      console.error('Erro ao carregar campanha:', err);
      return null;
    }
  },

  // Atualizar índice de campanhas
  async updateCampaignIndex(campaign) {
    if (!supabase) return;
    
    try {
      const { error } = await supabase
        .from('rpg_campaign_index')
        .upsert({
          id: campaign.id,
          world: campaign.world,
          char_name: campaign.char_name,
          updated_at: new Date().toISOString()
        });
      
      if (error) console.error('Erro ao atualizar índice:', error);
    } catch (err) {
      console.error('Erro ao atualizar índice:', err);
    }
  },

  // Listar campanhas
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
      
      return data;
    } catch (err) {
      console.error('Erro ao listar campanhas:', err);
      return [];
    }
  },

  // Deletar campanha
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
