// ── Habilidades do Sistema que mudam o corpo do personagem ──
// Uma compra como "Corpo de Gigante" muda a Ficha (altura, físico) e fica
// registrada como mudança permanente: todos veem o RESULTADO, ninguém vê o Sistema.

const HEIGHTS = ["Muito baixo", "Baixo", "Médio", "Alto", "Muito alto"];
const BODIES = ["Magro", "Atlético", "Médio", "Robusto", "Gordo"];

const norm = (v) => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const step = (list, cur, by) => {
  const i = Math.max(0, list.indexOf(cur));
  return list[Math.max(0, Math.min(list.length - 1, (i < 0 ? 2 : i) + by))];
};

/** Regras: o que no nome/descrição indica uma mudança que os outros percebem. */
const RULES = [
  { re: /(mais alto|crescer|cresce|cresceu|estatura|altura|gigante|colosso|alongar o corpo)/, apply: (a, t) => ({ height: step(HEIGHTS, a.height, /(muito|gigante|colosso|dois palmos|meio metro)/.test(t) ? 2 : 1) }), change: (a, p) => `ficou mais alto (${String(a.height || "Médio").toLowerCase()} → ${p.height.toLowerCase()})` },
  { re: /(mais baixo|encolher|encolhe|diminuir de tamanho)/, apply: (a) => ({ height: step(HEIGHTS, a.height, -1) }), change: (a, p) => `ficou mais baixo (${p.height.toLowerCase()})` },
  { re: /(musculo|musculatura|corpo de|fisico|forca (sobre|bruta|de)|titan|tita|robust|ombros largos|corpo forjado|corpo aprimorado)/, apply: (a, t) => ({ body: /(titan|tita|robust|ombros largos|bruta)/.test(t) || a.body === "Atlético" ? "Robusto" : "Atlético" }), change: (a, p) => `o corpo ficou visivelmente mais forte e definido (${p.body.toLowerCase()})` },
  { re: /(olhos? (de|que|brilh|dourad|vermelh)|olhar (de|do) (predador|dragao|lobo)|enxerga no escuro|visao noturna)/, apply: () => ({}), change: () => "os olhos mudaram: têm um brilho estranho que as pessoas notam ao encarar" },
  { re: /(beleza|belo|bela|atraente|charme|carisma|rosto perfeito|aparencia (nobre|marcante))/, apply: () => ({}), change: () => "a aparência ficou mais marcante e bonita; as pessoas olham duas vezes" },
  { re: /(pele de (aco|pedra|ferro|escama)|escamas|pele (dura|resistente|blindada))/, apply: () => ({}), change: () => "a pele mudou de textura e brilho; quem toca ou olha de perto estranha" },
  { re: /(cabelo|cabelos)/, apply: () => ({}), change: () => "o cabelo mudou de um jeito que quem conhece o personagem percebe" },
  { re: /(voz (de|que|grave|poderosa|comando)|voz de comando)/, apply: () => ({}), change: () => "a voz mudou: mais grave e firme, quem ouve sente a diferença" },
  { re: /(aura|presenca|intimidacao|imponente)/, apply: () => ({}), change: () => "passou a ter uma presença pesada que as pessoas sentem antes de entender por quê" },
  { re: /(rejuvenesc|mais jovem|juventude)/, apply: () => ({}), change: () => "parece alguns anos mais jovem" },
];

/** Mudança física de uma compra, ou null se não for algo que os outros percebem. */
export function manifestationFor(item = {}, appearance = {}) {
  const t = norm(`${item.name} ${item.desc}`);
  const patch = {};
  const changes = [];
  for (const rule of RULES) {
    if (!rule.re.test(t)) continue;
    const p = rule.apply({ ...appearance, ...patch }, t);
    changes.push(rule.change({ ...appearance, ...patch }, p));
    Object.assign(patch, p);
    if (changes.length >= 2) break;
  }
  if (!changes.length) return null;
  return { name: String(item.name || "Habilidade").slice(0, 60), appearancePatch: patch, change: changes.join("; ").slice(0, 240) };
}

/** Patch da campanha: atualiza a aparência (retrato e Ficha) e registra a mudança. */
export function applyManifestation(camp = {}, item = {}) {
  const m = manifestationFor(item, camp.appearance || {});
  if (!m) return { manifestation: null, patch: {} };
  const list = Array.isArray(camp.bodyChanges) ? camp.bodyChanges : [];
  const patch = { bodyChanges: [...list, { name: m.name, change: m.change }].slice(-12) };
  if (Object.keys(m.appearancePatch).length) patch.appearance = { ...(camp.appearance || {}), ...m.appearancePatch };
  return { manifestation: m, patch };
}

export function bodyChangesLine(camp = {}) {
  const list = Array.isArray(camp.bodyChanges) ? camp.bodyChanges.filter((c) => c && c.change) : [];
  if (!list.length) return "";
  return `MUDANÇAS FÍSICAS PERMANENTES do jogador (vieram do Sistema; todos veem o RESULTADO, ninguém vê a causa): ${list.map((c) => `${c.name}: ${c.change}`).join(" | ")}. Descreva o personagem assim daqui em diante. Quem o conhecia antes estranha ao reencontrá-lo pela primeira vez (comenta, desconfia, procura explicação da época: doença, milagre, bruxaria, idade); estranhos apenas reagem ao que veem.`;
}

// ── Beat imediato: a habilidade comprada se manifesta na cena atual ──
export const SYSTEM_BEAT_PREFIX = "[O Sistema aplicou:";

export function buildSystemBeatMessage(items = []) {
  const names = items.map((i) => i.name).filter(Boolean).join(", ") || "a compra";
  return `${SYSTEM_BEAT_PREFIX} ${names}]
Isto não é uma ação do personagem. Continue a CENA ATUAL (não avance tempo). Em um beat curto, mostre a notificação do Sistema e a habilidade se manifestando AGORA no corpo do jogador: a sensação física, o que muda e o que dá para ver. Se a mudança é visível, os NPCs presentes percebem na hora e reagem de forma coerente com a época e com quem são — sem saber do Sistema. Não fale, escolha ou sinta pelo jogador além da sensação física.`;
}

export function isSystemBeatMessage(text) {
  return String(text || "").trim().startsWith(SYSTEM_BEAT_PREFIX);
}

export function systemBeatDisplay() {
  return "O Sistema aplicou a compra na cena.";
}

// ── Habilidades que sobem os números da Ficha (espadachim → Combate e Destreza) ──
export const ATTR_LABELS = { strength: "Força", dexterity: "Destreza", mind: "Mente", charisma: "Carisma" };
export const SKILL_LABELS = { combat: "Combate", stealth: "Furtividade", magic: "Magia", persuasion: "Persuasão", survival: "Sobrevivência", perception: "Percepção" };
const SYSTEM_SKILL_CAP = 10;
const SYSTEM_ATTR_CAP = 30;

const BOOST_RULES = [
  { re: /(espad|esgrim|lamina|sabre|katana|florete|duelist|kenjutsu|iaido)/, attributes: { dexterity: 2 }, skills: { combat: 2 } },
  { re: /(combate|luta|lutar|guerreir|arte marcial|artes marciais|punho|soco|lanca|machado|maca de guerra|escudo|berserker|soldado|cavaleiro|samurai)/, attributes: { strength: 1 }, skills: { combat: 1 } },
  { re: /(arco|arqueir|flecha|pontaria|mira |atirador|pistola|mosquete|arcabuz|besta)/, attributes: { dexterity: 2 }, skills: { combat: 1, perception: 1 } },
  { re: /(forca|muscul|tita|titan|gigante|corpo de|brutal)/, attributes: { strength: 2 }, skills: {} },
  { re: /(agilidade|velocidade|reflexo|rapido|veloz|esquiva|acrobac|passo do vento)/, attributes: { dexterity: 2 }, skills: {} },
  { re: /(furtiv|sombra|silencio|sem som|invisib|assassin|ladr)/, attributes: { dexterity: 1 }, skills: { stealth: 2 } },
  { re: /(percep|olhar|visao|sentidos|detect|enxerga|instinto|hostilidade)/, attributes: {}, skills: { perception: 2 } },
  { re: /(intelig|mente|conhecimento|sabedoria|memoria|genio|estrateg|tatic)/, attributes: { mind: 2 }, skills: {} },
  { re: /(carisma|persuas|oratoria|lingua|beleza|charme|intimida|voz de comando|lideranca|aura)/, attributes: { charisma: 2 }, skills: { persuasion: 1 } },
  { re: /(magia|mana|feitic|arcano|elemental|bola de fogo|gelo|relampago|necromancia|runa)/, attributes: { mind: 1 }, skills: { magic: 2 } },
  { re: /(sobreviv|regenera|resistencia|cura|pele de|rastrear|cacador)/, attributes: {}, skills: { survival: 1 } },
];
const TIER_MULT = { E: 1, D: 1, C: 1.5, B: 1.5, A: 2, S: 2 };

/** Quanto uma habilidade soma nos atributos e perícias. */
export function statBoostFor(item = {}) {
  const t = norm(`${item.name} ${item.desc}`);
  const attributes = {};
  const skills = {};
  let hits = 0;
  for (const rule of BOOST_RULES) {
    if (!rule.re.test(t)) continue;
    hits += 1;
    for (const [k, v] of Object.entries(rule.attributes)) attributes[k] = Math.max(attributes[k] || 0, v);
    for (const [k, v] of Object.entries(rule.skills)) skills[k] = Math.max(skills[k] || 0, v);
    if (hits >= 3) break;
  }
  if (!hits) return null;
  const mult = TIER_MULT[String(item.tier || "E").toUpperCase()] || 1;
  const extra = /(mestre|lendari|supremo|divino|perfeit|absolut)/.test(t) ? 1 : 0;
  for (const k of Object.keys(attributes)) attributes[k] = Math.round(attributes[k] * mult) + extra;
  for (const k of Object.keys(skills)) skills[k] = Math.round(skills[k] * mult) + extra;
  return { attributes, skills };
}

export function describeBoost(boost) {
  if (!boost) return "";
  return [
    ...Object.entries(boost.attributes).map(([k, v]) => `+${v} ${ATTR_LABELS[k]}`),
    ...Object.entries(boost.skills).map(([k, v]) => `+${v} ${SKILL_LABELS[k]}`),
  ].join(", ");
}

/** Atributos e perícias novos com o bônus aplicado (com teto do Sistema). */
export function applyStatBoost(attributes = {}, skills = {}, item = {}) {
  const boost = statBoostFor(item);
  if (!boost) return { boost: null, attributes, skills };
  const a = { ...attributes };
  const s = { ...skills };
  for (const [k, v] of Object.entries(boost.attributes)) a[k] = Math.min(SYSTEM_ATTR_CAP, (Number(a[k]) || 10) + v);
  for (const [k, v] of Object.entries(boost.skills)) s[k] = Math.min(SYSTEM_SKILL_CAP, (Number(s[k]) || 1) + v);
  return { boost, attributes: a, skills: s };
}
