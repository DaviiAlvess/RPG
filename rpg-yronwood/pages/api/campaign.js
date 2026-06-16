import { getUserFromRequest, getSupabaseForUser, createRpgPersistence } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET" && req.method !== "DELETE") {
    return res.status(405).end();
  }

  const auth = await getUserFromRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "Faça login para acessar suas campanhas." });
  }

  const db = getSupabaseForUser(auth.token);
  if (!db) {
    return res.status(503).json({ error: "Supabase não configurado no servidor." });
  }

  const rpgPersistence = createRpgPersistence(db, auth.user.id);

  try {
    switch (req.method) {
      case "GET": {
        const { id } = req.query;

        if (id) {
          const campaign = await rpgPersistence.loadCampaign(id);
          if (!campaign) {
            return res.status(404).json({ error: "Campanha não encontrada." });
          }
          return res.status(200).json(campaign);
        }

        const campaigns = await rpgPersistence.listCampaigns();
        return res.status(200).json(campaigns);
      }

      case "POST": {
        const campaign = req.body;

        if (!campaign?.id) {
          return res.status(400).json({ error: "ID da campanha é obrigatório." });
        }

        const saved = await rpgPersistence.saveCampaign(campaign);
        if (!saved) {
          return res.status(500).json({ error: "Erro ao salvar campanha." });
        }

        return res.status(200).json({ success: true });
      }

      case "DELETE": {
        const { id: deleteId } = req.query;

        if (!deleteId) {
          return res.status(400).json({ error: "ID da campanha é obrigatório." });
        }

        const deleted = await rpgPersistence.deleteCampaign(deleteId);
        if (!deleted) {
          return res.status(500).json({ error: "Erro ao deletar campanha." });
        }

        return res.status(200).json({ success: true });
      }

      default:
        return res.status(405).end();
    }
  } catch (error) {
    console.error("Erro na API de campanhas:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}
