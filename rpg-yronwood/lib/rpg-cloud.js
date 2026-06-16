import { getSupabaseBrowser } from "./supabase-browser";

const toSnake = (c) => ({
  id: c.id,
  world: c.world,
  char_name: c.charName,
  char_title: c.charTitle,
  char_age: c.charAge,
  char_bg: c.charBg,
  char_personality: c.charPersonality,
  char_skills: c.charSkills,
  appearance: c.appearance ?? {},
  use_images: c.useImages ?? true,
  is_known_ip: c.isKnownIP ?? false,
  game_style: c.gameStyle ?? "aventura",
  world_bg: c.worldBg ?? "",
  relationships: c.relationships ?? {},
  lore: c.lore ?? "",
  msgs: c.msgs ?? [],
  disp: c.disp ?? [],
  img: c.img ?? null,
  hp: c.hp ?? 100,
  missions: c.missions ?? [],
  items: c.items ?? [],
  saves: c.saves ?? [],
});

const toCamel = (r) => ({
  id: r.id,
  world: r.world,
  charName: r.char_name,
  charTitle: r.char_title,
  charAge: r.char_age,
  charBg: r.char_bg,
  charPersonality: r.char_personality,
  charSkills: r.char_skills,
  appearance: r.appearance,
  useImages: r.use_images,
  isKnownIP: r.is_known_ip,
  gameStyle: r.game_style,
  worldBg: r.world_bg,
  relationships: r.relationships,
  lore: r.lore,
  msgs: r.msgs,
  disp: r.disp,
  img: r.img,
  hp: r.hp,
  missions: r.missions,
  items: r.items,
  saves: r.saves,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

async function getClient() {
  const sb = getSupabaseBrowser();
  if (!sb) return { sb: null, user: null, error: "Supabase não configurado." };
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) return { sb, user: null, error: "Faça login para continuar." };
  return { sb, user, error: null };
}

export async function cloudSaveCampaign(campaign) {
  const { sb, user, error } = await getClient();
  if (error) return { ok: false, error };

  const now = new Date().toISOString();
  const row = {
    ...toSnake(campaign),
    user_id: user.id,
    updated_at: now,
  };

  const { error: err1 } = await sb
    .from("rpg_campaigns")
    .upsert(row, { onConflict: "id" });

  if (err1) {
    console.error("cloudSaveCampaign:", err1);
    return { ok: false, error: err1.message || "Erro ao salvar campanha." };
  }

  const { error: err2 } = await sb
    .from("rpg_campaign_index")
    .upsert({
      id: campaign.id,
      user_id: user.id,
      world: campaign.world,
      char_name: campaign.charName,
      updated_at: now,
    }, { onConflict: "id" });

  if (err2) {
    console.error("cloudSaveIndex:", err2);
    return { ok: false, error: err2.message || "Erro ao atualizar lista." };
  }

  return { ok: true };
}

export async function cloudLoadCampaign(id) {
  const { sb, user, error } = await getClient();
  if (error) return { ok: false, error, data: null };

  const { data, error: err } = await sb
    .from("rpg_campaigns")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (err) return { ok: false, error: err.message, data: null };
  if (!data) return { ok: false, error: "Campanha não encontrada.", data: null };
  return { ok: true, data: toCamel(data) };
}

export async function cloudListCampaigns() {
  const { sb, user, error } = await getClient();
  if (error) return { ok: false, error, data: [] };

  const { data, error: err } = await sb
    .from("rpg_campaign_index")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (err) return { ok: false, error: err.message, data: [] };

  return {
    ok: true,
    data: (data || []).map((r) => ({
      id: r.id,
      world: r.world,
      charName: r.char_name,
      updatedAt: r.updated_at,
      createdAt: r.created_at,
    })),
  };
}

export async function cloudDeleteCampaign(id) {
  const { sb, user, error } = await getClient();
  if (error) return { ok: false, error };

  const { error: e1 } = await sb.from("rpg_campaigns").delete().eq("id", id).eq("user_id", user.id);
  const { error: e2 } = await sb.from("rpg_campaign_index").delete().eq("id", id).eq("user_id", user.id);

  if (e1 || e2) return { ok: false, error: (e1 || e2)?.message || "Erro ao apagar." };
  return { ok: true };
}

/** Verifica se tabelas existem (útil para diagnóstico na UI) */
export async function cloudHealthCheck() {
  const { sb, user, error } = await getClient();
  if (error) return { ok: false, error };
  const { error: err } = await sb.from("rpg_campaign_index").select("id").limit(1);
  if (err) {
    if (err.message?.includes("does not exist") || err.code === "42P01") {
      return { ok: false, error: "Tabelas não criadas. Execute supabase/schema.sql no painel do Supabase." };
    }
    return { ok: false, error: err.message };
  }
  return { ok: true, userId: user.id };
}
