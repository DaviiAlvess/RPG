// ─── Aparência do personagem ──────────────────────────────────────────
// Opções estruturadas, texto para o Mestre (Gemini) e retrato gerado por
// imagem com semente fixa, para o rosto não mudar entre sessões.
// As opções antigas foram mantidas com os mesmos textos: saves antigos continuam válidos.

export const APP_OPTIONS = {
  presentation: ["Masculina", "Feminina", "Andrógina"],
  body:      ["Magro",       "Atlético",   "Médio",        "Robusto",    "Gordo"],
  height:    ["Muito baixo", "Baixo",      "Médio",        "Alto",       "Muito alto"],
  skin:      ["Muito clara", "Clara",      "Morena clara", "Morena",     "Negra"],
  hairLen:   ["Careca",      "Curto",      "Médio",        "Longo",      "Muito longo"],
  hairColor: ["Preto",       "Castanho",   "Loiro",        "Ruivo",      "Branco/Grisalho"],
  hairStyle: ["Liso",        "Ondulado",   "Cacheado",     "Crespo",     "Raspado/Moicano"],
  eyeColor:  ["Castanhos",   "Verdes",     "Azuis",        "Cinzas",     "Pretos"],
  eyeShape:  ["Amendoados",  "Redondos",   "Puxados",      "Pequenos",   "Grandes"],
  face:      ["Oval",        "Quadrada",   "Redonda",      "Triangular", "Alongada"],
  extras:    ["Nenhum",      "Cicatriz",   "Tatuagem",     "Barba",      "Sardas"],
};

export const APP_LABELS = {
  presentation: "Aparência geral",
  body: "Tipo de corpo", height: "Altura", skin: "Tom de pele",
  hairLen: "Comprimento do cabelo", hairColor: "Cor do cabelo", hairStyle: "Estilo do cabelo",
  eyeColor: "Cor dos olhos", eyeShape: "Formato dos olhos", face: "Formato do rosto", extras: "Marca especial",
};

// Grupos para a tela de criação (menos rolagem no celular).
export const APP_GROUPS = [
  { id: "corpo", label: "Corpo", keys: ["presentation", "body", "height", "skin"] },
  { id: "cabelo", label: "Cabelo", keys: ["hairLen", "hairColor", "hairStyle"] },
  { id: "rosto", label: "Rosto", keys: ["eyeColor", "eyeShape", "face", "extras"] },
];

export const DEFAULT_APP = {
  presentation: "Masculina",
  ...Object.fromEntries(Object.keys(APP_OPTIONS).filter((k) => k !== "presentation").map((k) => [k, APP_OPTIONS[k][2]])),
};

export const HAIR_COLORS = { "Preto": "#0a0a0a", "Castanho": "#5c3317", "Loiro": "#c8a84b", "Ruivo": "#8b2500", "Branco/Grisalho": "#a0a0a0" };
export const EYE_COLORS  = { "Castanhos": "#5c3317", "Verdes": "#2d6a4f", "Azuis": "#1a4a7a", "Cinzas": "#607080", "Pretos": "#0a0a14" };

const lower = (v) => String(v || "").toLowerCase();
const clean = (v, max = 300) => String(v || "").replace(/\s+/g, " ").trim().slice(0, max);

/** Frase em português com os traços escolhidos (formato antigo, mantido). */
export function buildAppearance(a = {}) {
  const parts = [];
  if (a.presentation) parts.push(`aparência ${lower(a.presentation)}`);
  if (a.body) parts.push(`corpo ${lower(a.body)}`);
  if (a.height) parts.push(`estatura ${lower(a.height)}`);
  if (a.skin) parts.push(`pele ${lower(a.skin)}`);
  const hair = [a.hairLen, a.hairColor, a.hairStyle].filter(Boolean).map(lower).join(" ");
  if (hair) parts.push(`cabelo ${hair}`);
  const eyes = [a.eyeColor, a.eyeShape].filter(Boolean).map(lower).join(" ");
  if (eyes) parts.push(`olhos ${eyes}`);
  if (a.face) parts.push(`rosto ${lower(a.face)}`);
  if (a.extras && a.extras !== "Nenhum") parts.push(`marca especial: ${lower(a.extras)}`);
  return parts.length ? `Aparência: ${parts.join(", ")}.` : "";
}

/**
 * Linha(s) de aparência para o prompt do Mestre.
 * - Saves antigos (sem appearanceCustomized): nota canônica tem prioridade, senão os chips.
 * - Se o jogador mexeu nos chips, eles entram junto com a nota e a roupa.
 */
export function appearanceForGm(c = {}) {
  const note = clean(c.charAppearanceNote, 600);
  const outfit = clean(c.charOutfit, 300);
  const chips = c.appearance && (c.appearanceCustomized || !note) ? buildAppearance(c.appearance) : "";
  const lines = [];
  if (chips) lines.push(chips);
  if (note) lines.push(`Aparência canônica: ${note}`);
  if (outfit) lines.push(`Roupa e estilo: ${outfit}`);
  return lines;
}

// ── Retrato ───────────────────────────────────────────────────────────
const EN = {
  presentation: { "Masculina": "man", "Feminina": "woman", "Andrógina": "androgynous person" },
  body: { "Magro": "slim", "Atlético": "athletic", "Médio": "average", "Robusto": "sturdy, broad-shouldered", "Gordo": "heavyset" },
  skin: { "Muito clara": "very fair", "Clara": "fair", "Morena clara": "light brown", "Morena": "brown", "Negra": "dark brown" },
  hairLen: { "Careca": "bald", "Curto": "short", "Médio": "medium-length", "Longo": "long", "Muito longo": "very long" },
  hairColor: { "Preto": "black", "Castanho": "brown", "Loiro": "blond", "Ruivo": "red", "Branco/Grisalho": "white-grey" },
  hairStyle: { "Liso": "straight", "Ondulado": "wavy", "Cacheado": "curly", "Crespo": "coily", "Raspado/Moicano": "shaved mohawk" },
  eyeColor: { "Castanhos": "brown", "Verdes": "green", "Azuis": "blue", "Cinzas": "grey", "Pretos": "black" },
  eyeShape: { "Amendoados": "almond-shaped", "Redondos": "round", "Puxados": "monolid", "Pequenos": "narrow", "Grandes": "large" },
  face: { "Oval": "oval", "Quadrada": "square-jawed", "Redonda": "round", "Triangular": "heart-shaped", "Alongada": "long" },
  extras: { "Nenhum": "", "Cicatriz": "a visible facial scar", "Tatuagem": "a visible tattoo", "Barba": "a beard", "Sardas": "freckles" },
};

export const PORTRAIT_STYLES = {
  painted: { label: "Pintura", prompt: "painterly character portrait, oil painting, rich texture" },
  realistic: { label: "Realista", prompt: "cinematic realistic character portrait, film still, shallow depth of field" },
  anime: { label: "Anime", prompt: "anime style character portrait, clean line art, cel shading" },
};

const tr = (key, value) => (EN[key] && EN[key][value] !== undefined ? EN[key][value] : lower(value));

/** Descrição em inglês para o gerador de imagem. Nunca usa o nome (evita sósias de pessoas reais). */
export function portraitPrompt(c = {}) {
  const a = { ...DEFAULT_APP, ...(c.appearance || {}) };
  const age = parseInt(c.charAge, 10);
  const who = [
    Number.isFinite(age) && age > 0 ? `${Math.min(age, 120)}-year-old` : "",
    tr("body", a.body),
    tr("presentation", a.presentation),
  ].filter(Boolean).join(" ");
  const hair = a.hairLen === "Careca"
    ? "bald head"
    : `${tr("hairLen", a.hairLen)} ${tr("hairStyle", a.hairStyle)} ${tr("hairColor", a.hairColor)} hair`;
  const bits = [
    `head and shoulders portrait of a ${who}`,
    `${tr("skin", a.skin)} skin`,
    hair,
    `${tr("eyeShape", a.eyeShape)} ${tr("eyeColor", a.eyeColor)} eyes`,
    `${tr("face", a.face)} face`,
    tr("extras", a.extras),
  ];
  const outfit = clean(c.charOutfit, 160);
  if (outfit) bits.push(`wearing ${outfit}`);
  const note = clean(c.charAppearanceNote, 200);
  if (note) bits.push(note);
  const style = PORTRAIT_STYLES[c.portraitStyle] || PORTRAIT_STYLES.painted;
  const world = clean(c.world, 60);
  bits.push(world ? `${world} setting` : "fantasy setting");
  bits.push(style.prompt, "dramatic lighting, looking at viewer, plain dark background, no text, no watermark");
  return bits.filter(Boolean).join(", ");
}

export function randomSeed() {
  return Math.floor(Math.random() * 999999) + 1;
}

/** Hash estável (FNV-1a) para transformar texto numa semente. */
export function hashSeed(text) {
  let h = 2166136261;
  for (const ch of String(text || "")) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 999999 + 1;
}

export function portraitUrl(c = {}, seed = c.portraitSeed) {
  const s = Number(seed) || hashSeed(`${c.charName || ""}|${c.world || ""}`);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(portraitPrompt(c))}?width=512&height=512&nologo=true&seed=${s}`;
}

/** Semente da cena: mesmo mundo + mesmo local → mesma semente (lugares parecidos entre visitas). */
export function sceneSeed(world, location) {
  const loc = clean(location, 120).toLowerCase();
  if (!loc) return randomSeed();
  return hashSeed(`${lower(world)}|${loc}`);
}

export function sceneImageUrl(prompt, world, location) {
  const full = `${prompt}, ${world || "fantasy"} setting, cinematic, dramatic lighting, photorealistic, 8k, no text, no people`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=900&height=360&nologo=true&seed=${sceneSeed(world, location)}`;
}

/** O retrato salvo ainda corresponde à aparência atual? */
export function portraitIsCurrent(c = {}) {
  return Boolean(c.portraitUrl) && c.portraitUrl === portraitUrl(c, c.portraitSeed);
}

/**
 * Retrato de NPC a partir do que o Mestre registrou (função; personalidade; local; fatos).
 * Semente fixa pelo nome + mundo: o mesmo NPC mantém o rosto. Não usa o nome no prompt.
 */
export function npcPortraitUrl(name, facts, world, style = "painted") {
  const parts = String(facts || "").split(";").map((s) => clean(s, 90)).filter(Boolean);
  const role = parts[0] || "local person";
  const look = parts[1] || "";
  const s = PORTRAIT_STYLES[style] || PORTRAIT_STYLES.painted;
  const w = clean(world, 60);
  const prompt = [
    `head and shoulders portrait of a ${role}`,
    look ? `personality: ${look}` : "",
    w ? `${w} setting` : "fantasy setting",
    s.prompt,
    "expressive face, dramatic lighting, plain dark background, no text, no watermark",
  ].filter(Boolean).join(", ");
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=256&height=256&nologo=true&seed=${hashSeed(`${lower(name)}|${lower(world)}`)}`;
}
