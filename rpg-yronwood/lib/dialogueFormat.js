/**
 * Parser e normalização de narração + diálogos.
 */

const SPEAKER_VERBS =
  "disse|falou|sussurrou|gritou|perguntou|murmurou|respondeu|exclamou|completou|retrucou|balbuciou|rosnou|replicou|insistiu|continuou|admitiu|confessou|declarou|anunciou|comentou|observou|notou|repetiu|soltou";

const QUOTE = `[«""']([^«""'\\n]+)[»""']`;

const DIALOGUE_LINE_RE =
  /^(?:[-*•]\s*)?(?:\*\*)?(Você|[A-Za-zÀ-úà-ú][A-Za-zà-úÀ-Ú0-9''\-\. ]{0,34})(?:\*\*)?\s*:\s+(.+)$/;

function stripOuterQuotes(text) {
  return String(text || "")
    .replace(/^[\s"'«""]+|[\s"'»""]+$/g, "")
    .trim();
}

function cleanSpeaker(name) {
  return String(name || "")
    .replace(/\*\*/g, "")
    .replace(/^[\-*•]\s*/, "")
    .trim();
}

/** Normaliza texto bruto do narrador antes de exibir */
export function normalizeDialogueText(text) {
  if (!text || typeof text !== "string") return text;

  let result = text
    .replace(/\*\*([^*]+)\*\*:\s*/g, "$1: ")
    .replace(/^[\-*•]\s+(?=[A-Za-zÀ-úà-ú])/gm, "");

  result = result.replace(
    new RegExp(`${QUOTE}\\s*,?\\s*(?:${SPEAKER_VERBS})\\s+([A-Za-zÀ-úà-ú][A-Za-zà-úÀ-Ú''\\-\\. ]{0,34})`, "gi"),
    (_, quote, speaker) => `\n${cleanSpeaker(speaker)}: "${stripOuterQuotes(quote)}"\n`
  );

  result = result.replace(
    new RegExp(`([A-Za-zÀ-úà-ú][A-Za-zà-úÀ-Ú''\\-\\. ]{0,34})\\s+(?:${SPEAKER_VERBS})\\s*:?\\s*${QUOTE}`, "gi"),
    (_, speaker, quote) => `\n${cleanSpeaker(speaker)}: "${stripOuterQuotes(quote)}"\n`
  );

  result = result.replace(
    new RegExp(`${QUOTE}\\s*[—–-]\\s*([A-Za-zÀ-úà-ú][A-Za-zà-úÀ-Ú''\\-\\. ]{0,34})`, "gi"),
    (_, quote, speaker) => `\n${cleanSpeaker(speaker)}: "${stripOuterQuotes(quote)}"\n`
  );

  return result.replace(/\n{3,}/g, "\n\n").trim();
}

function findInlineDialogues(text) {
  const matches = [];
  const patterns = [
    {
      re: new RegExp(`${QUOTE}\\s*,?\\s*(?:${SPEAKER_VERBS})\\s+([A-Za-zÀ-úà-ú][A-Za-zà-úÀ-Ú''\\-\\. ]{0,34})`, "gi"),
      speaker: (m) => m[2],
      quote: (m) => m[1],
    },
    {
      re: new RegExp(`([A-Za-zÀ-úà-ú][A-Za-zà-úÀ-Ú''\\-\\. ]{0,34})\\s+(?:${SPEAKER_VERBS})\\s*:?\\s*${QUOTE}`, "gi"),
      speaker: (m) => m[1],
      quote: (m) => m[2],
    },
    {
      re: new RegExp(`${QUOTE}\\s*[—–-]\\s*([A-Za-zÀ-úà-ú][A-Za-zà-úÀ-Ú''\\-\\. ]{0,34})`, "gi"),
      speaker: (m) => m[2],
      quote: (m) => m[1],
    },
  ];

  for (const { re, speaker, quote } of patterns) {
    re.lastIndex = 0;
    for (const match of text.matchAll(re)) {
      matches.push({
        index: match.index,
        length: match[0].length,
        speaker: cleanSpeaker(speaker(match)),
        text: stripOuterQuotes(quote(match)),
      });
    }
  }

  matches.sort((a, b) => a.index - b.index);

  const deduped = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.index < cursor) continue;
    deduped.push(match);
    cursor = match.index + match.length;
  }
  return deduped;
}

function splitParagraphWithInlineDialogues(text) {
  const matches = findInlineDialogues(text);
  if (!matches.length) {
    return [{ type: "narrative", text: text.trim() }].filter((b) => b.text);
  }

  const blocks = [];
  let cursor = 0;

  for (const match of matches) {
    const before = text.slice(cursor, match.index).trim();
    if (before) blocks.push({ type: "narrative", text: before });
    blocks.push({ type: "dialogue", speaker: match.speaker, text: match.text });
    cursor = match.index + match.length;
  }

  const after = text.slice(cursor).trim();
  if (after) blocks.push({ type: "narrative", text: after });
  return blocks;
}

function parseNarrativeParagraph(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const lineMatch = trimmed.match(DIALOGUE_LINE_RE);
  if (lineMatch) {
    return [{
      type: "dialogue",
      speaker: cleanSpeaker(lineMatch[1]),
      text: stripOuterQuotes(lineMatch[2]),
    }];
  }

  return splitParagraphWithInlineDialogues(trimmed);
}

/**
 * @param {string} text
 */
export function parseNarrativeBlocks(text) {
  if (!text || typeof text !== "string") return [];

  const normalized = normalizeDialogueText(text);
  const paragraphs = normalized.split(/\n+/);
  const blocks = [];

  for (const paragraph of paragraphs) {
    for (const block of parseNarrativeParagraph(paragraph)) {
      if (!block.text && block.type !== "dialogue") continue;
      const last = blocks[blocks.length - 1];
      if (block.type === "narrative" && last?.type === "narrative") {
        last.text = `${last.text}\n\n${block.text}`.trim();
      } else {
        blocks.push(block);
      }
    }
  }

  return blocks;
}

export function hasDialogueBlocks(text) {
  return parseNarrativeBlocks(text).some((block) => block.type === "dialogue");
}

/** Cena em que a fala carrega a batida — a mesa deve ler como conversa. */
export function isDialogueHeavy(text) {
  const blocks = parseNarrativeBlocks(text);
  if (!blocks.length) return false;
  const dialogues = blocks.filter((block) => block.type === "dialogue");
  if (!dialogues.length) return false;
  const dialogueChars = dialogues.reduce((sum, block) => sum + String(block.text || "").length, 0);
  const narrativeChars = blocks
    .filter((block) => block.type === "narrative")
    .reduce((sum, block) => sum + String(block.text || "").length, 0);
  return dialogues.length >= 2 || dialogueChars >= narrativeChars;
}

/** Últimos falantes da cena (NPCs), para o Mestre não trocar o elenco à toa. */
export function recentSpeakers(messages, playerName, limit = 3) {
  const name = String(playerName || "").trim().toLowerCase();
  const found = [];
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0 && found.length < limit; i -= 1) {
    const entry = list[i];
    const kind = entry?.type || entry?.role;
    if (!['gm', 'assistant'].includes(kind)) continue;
    const text = String(entry?.text || entry?.content || "");
    const blocks = parseNarrativeBlocks(text).filter((block) => block.type === "dialogue");
    for (let j = blocks.length - 1; j >= 0 && found.length < limit; j -= 1) {
      const speaker = String(blocks[j].speaker || "").trim();
      if (!speaker) continue;
      if (/^você$/i.test(speaker)) continue;
      if (name && speaker.toLowerCase() === name) continue;
      if (found.some((item) => item.toLowerCase() === speaker.toLowerCase())) continue;
      found.push(speaker);
    }
  }
  return found;
}

const PLAYER_SPEECH_VERBS = /^(digo|falo|respondo|pergunto|ordeno|grito|sussurro|exclamo)$/i;

/**
 * Mostra a jogada do personagem como fala na mesa quando ele está falando,
 * para a conversa ler como diálogo entre pessoas.
 */
export function formatPlayerTurnDisplay(text, charName) {
  const raw = String(text || "").trim();
  const name = String(charName || "Você").trim() || "Você";
  if (!raw) return raw;

  const onlyQuote = raw.match(/^[«""'](.+)[»""']$/s);
  if (onlyQuote) return `${name}: "${stripOuterQuotes(onlyQuote[1])}"`;

  const verbSpeech = raw.match(
    /^(digo|falo|respondo|pergunto|ordeno|grito|sussurro|exclamo)\s*:?\s*[«""'](.+)[»""']\s*$/is
  );
  if (verbSpeech) return `${name}: "${stripOuterQuotes(verbSpeech[2])}"`;

  const digoQue = raw.match(/^(digo|falo|respondo|pergunto|ordeno)\s+que\s+(.+)$/is);
  if (digoQue && String(digoQue[2]).length <= 160) {
    return `${name}: "${stripOuterQuotes(digoQue[2])}"`;
  }

  const lineAsVerb = raw.match(DIALOGUE_LINE_RE);
  if (lineAsVerb && PLAYER_SPEECH_VERBS.test(cleanSpeaker(lineAsVerb[1]))) {
    return `${name}: "${stripOuterQuotes(lineAsVerb[2])}"`;
  }

  const actionAndQuote = raw.match(/^(.+?)\s+[«""'](.+)[»""']\s*$/s);
  if (actionAndQuote && String(actionAndQuote[1]).length < 90) {
    return `${actionAndQuote[1].trim()}\n${name}: "${stripOuterQuotes(actionAndQuote[2])}"`;
  }

  if (hasDialogueBlocks(raw)) return normalizeDialogueText(raw);
  return raw;
}

export const DIALOGUE_TONE_COUNT = 6;

/** Stable 0–5 index from the speaker name (case-insensitive). */
export function speakerToneIndex(name, count = DIALOGUE_TONE_COUNT) {
  const key = String(name || "").trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % count;
}
