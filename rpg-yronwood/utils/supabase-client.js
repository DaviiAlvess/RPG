// Cliente Supabase para o frontend
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Funções para persistência no frontend
export const campaignStorage = {
  // Salvar campanha
  async saveCampaign(campaign) {
    try {
      const response = await fetch('/api/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign)
      });
      
      if (!response.ok) {
        throw new Error('Erro ao salvar campanha');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao salvar campanha:', error);
      // Fallback para localStorage
      try {
        localStorage.setItem(`rpg-camp-${campaign.id}`, JSON.stringify(campaign));
        return { success: true, fallback: true };
      } catch (e) {
        console.error('Fallback localStorage também falhou:', e);
        return { success: false, error: error.message };
      }
    }
  },

  // Carregar campanha
  async loadCampaign(id) {
    try {
      const response = await fetch(`/api/campaign?id=${encodeURIComponent(id)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Erro ao carregar campanha');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao carregar campanha:', error);
      // Fallback para localStorage
      try {
        const data = localStorage.getItem(`rpg-camp-${id}`);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        console.error('Fallback localStorage também falhou:', e);
        return null;
      }
    }
  },

  // Listar campanhas
  async listCampaigns() {
    try {
      const response = await fetch('/api/campaign');
      
      if (!response.ok) {
        throw new Error('Erro ao listar campanhas');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao listar campanhas:', error);
      // Fallback para localStorage
      try {
        const idxKey = "rpg-idx-v3";
        const idx = JSON.parse(localStorage.getItem(idxKey) || "[]");
        return idx;
      } catch (e) {
        console.error('Fallback localStorage também falhou:', e);
        return [];
      }
    }
  },

  // Deletar campanha
  async deleteCampaign(id) {
    try {
      const response = await fetch(`/api/campaign?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Erro ao deletar campanha');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao deletar campanha:', error);
      // Fallback para localStorage
      try {
        localStorage.removeItem(`rpg-camp-${id}`);
        const idxKey = "rpg-idx-v3";
        const idx = JSON.parse(localStorage.getItem(idxKey) || "[]");
        const newIdx = idx.filter(c => c.id !== id);
        localStorage.setItem(idxKey, JSON.stringify(newIdx));
        return { success: true, fallback: true };
      } catch (e) {
        console.error('Fallback localStorage também falhou:', e);
        return { success: false, error: error.message };
      }
    }
  }
};
