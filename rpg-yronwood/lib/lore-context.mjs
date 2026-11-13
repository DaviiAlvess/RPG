// ── Lore do contexto (histórias de obras que já existem) ──
// 1) No começo, a pesquisa de lore usa o RECORTE da história (época, lugar, papel do
//    jogador), não só o nome da obra: "Westeros no ano 130" é outra lore que "Westeros".
// 2) Durante o jogo, nomes próprios novos que aparecem na mesa (personagens, lugares,
//    casas, clãs) são pesquisados na obra e guardados em camp.loreNotes.
// 3) Só as notas dos nomes citados nas últimas falas entram no prompt.

const clip = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);
const norm = (v) => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Texto curto que diz à pesquisa QUAL recorte da obra a história usa. */
export function loreContextFor(camp = {}) {
  const parts = [
    camp.worldBg && `Época e cenário: ${clip(camp.worldBg, 600)}`,
    camp.worldState?.location && `Lugar inicial: ${clip(camp.worldState.location, 160)}`,
    camp.charTitle && `Papel do jogador: ${clip(camp.charTitle, 160)}`,
    camp.storyStartPoint && `Ponto de partida: ${clip(camp.storyStartPoint, 500)}`,
  ].filter(Boolean);
  return parts.join("\n").slice(0, 1500);
}

// Palavras que aparecem com maiúscula só por abrirem a frase (ou por serem títulos genéricos).
const COMMON = new Set(norm(`
  O A Os As Um Uma Uns Umas Você Voce Vocês Ele Ela Eles Elas Eu Nós Nos Meu Minha Seu Sua Esse Essa Este Esta Isso Isto Aquele Aquela
  Mas E Ou Se Quando Depois Antes Então Entao Lá La Aqui Ali Agora Ainda Já Ja Sim Não Nao Talvez Nunca Sempre Mesmo Também Tambem
  Por Para Com Sem Sobre Entre Até Ate De Do Da Dos Das No Na Nos Nas Em Ao Aos À As Pelo Pela Que Quem Qual Onde Como Porque Por que
  Oi Olá Ola Ei Hein Bem Bom Boa Certo Claro Nada Tudo Todos Todas Algo Alguém Alguem Ninguém Ninguem Cada Outro Outra Mais Menos Muito
  Senhor Senhora Sor Lorde Lady Rei Rainha Príncipe Principe Princesa Mestre Capitão Capitao Sargento Padre Irmão Irmao Irmã Irma Tio Tia Avó Avo
  Dia Noite Manhã Manha Tarde Hoje Ontem Amanhã Amanha Sistema Missão Missao Nível Nivel Rank XP HP Ficha Mestre Narrador Jogador
  Segunda Terça Quarta Quinta Sexta Sábado Sabado Domingo Janeiro Fevereiro Março Abril Maio Junho Julho Agosto Setembro Outubro Novembro Dezembro
`).split(/\s+/).filter(Boolean));
const CONNECTORS = new Set(["de", "da", "do", "dos", "das", "of", "the", "von", "van", "al", "el", "la", "le", "du"]);
// Títulos ficam junto do nome ("Sor Brynden Tully"), mas sozinhos não são tópico.
const TITLES = new Set(norm("Sor Lorde Lady Rei Rainha Príncipe Principe Princesa Mestre Meistre Capitão Capitao Sargento Padre Irmão Irmao Irmã Irma Senhor Senhora Dom Dona Jarl Lord").split(/\s+/));

/** Nomes próprios (uma ou mais palavras com maiúscula) num texto. */
export function candidateTopics(text) {
  const clean = String(text || "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/【[^】]*】/g, " ")
    .replace(/IMAGE_PROMPT:.*$/gim, " ");
  const tokens = clean.split(/(\s+|[.,;:!?…"“”«»()—–-]+)/);
  const out = new Map();
  let run = [];
  let sentenceStart = true;
  const flush = () => {
    while (run.length && CONNECTORS.has(norm(run[run.length - 1]))) run.pop();
    // "Mas Roose Bolton" → "Roose Bolton": palavra comum no começo cai fora (título fica).
    while (run.length > 1 && COMMON.has(norm(run[0])) && !TITLES.has(norm(run[0]))) { run.shift(); run.startedSentence = false; }
    if (run.length) {
      const words = run.filter((w) => !CONNECTORS.has(norm(w)));
      const meaningful = words.filter((w) => !COMMON.has(norm(w)));
      if (meaningful.length && !(words.length === 1 && run.startedSentence)) {
        // Título + nome ("Sor Jaime", "Lorde Bolton") fica inteiro; título sozinho não conta.
        const name = run.join(" ").replace(/^(O|A|Os|As)\s+/, "");
        if (name.length >= 3 && name.length <= 48) {
          const key = norm(name);
          if (!out.has(key)) out.set(key, name);
        }
      }
    }
    run = [];
  };
  for (const tok of tokens) {
    if (!tok) continue;
    if (/^\s+$/.test(tok)) continue;
    if (/^[.!?…"“”«»—–:]+$/.test(tok)) { flush(); sentenceStart = /[.!?…:"“”«»—–]/.test(tok); continue; }
    if (/^[,;()-]+$/.test(tok)) { flush(); continue; }
    const capital = /^[A-ZÀ-Ý][\p{L}'’]+$/u.test(tok);
    if (capital) {
      if (!run.length) run.startedSentence = sentenceStart;
      run.push(tok);
    } else if (run.length && CONNECTORS.has(norm(tok))) {
      run.push(tok);
    } else {
      flush();
    }
    sentenceStart = false;
  }
  flush();
  return [...out.values()];
}

/** Nomes que a campanha já conhece (não precisam de pesquisa). */
function knownNames(camp = {}) {
  const known = new Set();
  const add = (v) => { const k = norm(v).trim(); if (k) known.add(k); };
  for (const k of Object.keys(camp.loreNotes || {})) add(k);
  for (const k of Object.keys(camp.worldState?.npcs || {})) add(k);
  for (const k of Object.keys(camp.relationships || {})) add(k);
  for (const part of String(camp.charName || "").split(/[\s()]+/)) if (part.length > 2) add(part);
  add(camp.charName);
  for (const p of camp.plots || []) add(p?.title);
  return known;
}

/** Nomes citados nas últimas falas que ainda não têm lore pesquisada. */
export function pendingLoreTopics(camp = {}, recentText = "", max = 4) {
  if (!camp.isKnownIP) return [];
  const known = knownNames(camp);
  const lore = norm(camp.lore);
  const tried = new Set((camp.loreTried || []).map(norm));
  return candidateTopics(recentText)
    .filter((name) => {
      const k = norm(name);
      if (known.has(k) || tried.has(k)) return false;
      // Já descrito na lore do começo com destaque (aparece mais de uma vez): não precisa.
      const hits = lore ? lore.split(k).length - 1 : 0;
      return hits < 2;
    })
    .slice(0, max);
}

/** Notas de lore dos nomes citados agora, para o prompt. */
export function loreNotesLines(camp = {}, recentText = "", { max = 8, chars = 1800 } = {}) {
  const notes = camp.loreNotes && typeof camp.loreNotes === "object" ? camp.loreNotes : {};
  const text = norm(recentText);
  if (!text) return [];
  const picked = Object.entries(notes).filter(([name, fact]) => fact && text.includes(norm(name))).slice(0, max);
  if (!picked.length) return [];
  let used = 0;
  const lines = [];
  for (const [name, fact] of picked) {
    const line = `- ${name}: ${clip(fact, 360)}`;
    if (used + line.length > chars) break;
    lines.push(line);
    used += line.length;
  }
  return lines.length ? ["LORE CANÔNICA DOS NOMES EM CENA (pesquisada na obra; respeite, sem despejar tudo de uma vez):", ...lines] : [];
}

/** Junta notas novas às antigas (guarda no máximo 80) e lembra o que já foi tentado. */
export function mergeLoreNotes(camp = {}, notes = {}, tried = []) {
  const merged = { ...(camp.loreNotes || {}) };
  for (const [name, fact] of Object.entries(notes || {})) {
    const n = clip(name, 48);
    const f = clip(fact, 400);
    if (n && f && !/^(desconhecid|não (encontr|há)|nao (encontr|ha)|original|sem informa)/i.test(f)) merged[n] = f;
  }
  const keys = Object.keys(merged);
  const trimmed = keys.length > 80 ? Object.fromEntries(keys.slice(-80).map((k) => [k, merged[k]])) : merged;
  const triedList = [...new Set([...(camp.loreTried || []), ...tried])].slice(-120);
  return { loreNotes: trimmed, loreTried: triedList };
}

/** Texto das últimas falas que a mesa está usando agora (ação do jogador + últimas narrações). */
export function recentLoreText(input = "", disp = [], n = 3) {
  const gm = (Array.isArray(disp) ? disp : []).filter((m) => m && (m.type === "gm" || m.role === "assistant")).slice(-n)
    .map((m) => String(m.text || m.content || ""));
  return [String(input || ""), ...gm].join("\n").slice(-6000);
}
