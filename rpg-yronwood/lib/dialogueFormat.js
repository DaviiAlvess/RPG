/**
 * Parser de narração + diálogos no formato `Nome: "fala"`.
 */

const DIALOGUE_LINE_RE =
  /^(Você|[A-Za-zÀ-ú][A-Za-zà-úÀ-Ú0-9''\-\. ]{0,34}):\s+(.+)$/;

function stripOuterQuotes(text) {
  return String(text || "")
    .replace(/^[\s"'«""]+|[\s"'»""]+$/g, "")
    .trim();
}

/**
 * @param {string} text
 * @returns {Array<{ type: 'narrative', text: string } | { type: 'dialogue', speaker: string, text: string }>}
 */
export function parseNarrativeBlocks(text) {
  if (!text || typeof text !== "string") return [];

  const lines = text.split(/\n/);
  const blocks = [];
  let narrativeBuffer = [];

  const flushNarrative = () => {
    const joined = narrativeBuffer.join("\n").trim();
    if (joined) blocks.push({ type: "narrative", text: joined });
    narrativeBuffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (narrativeBuffer.length) narrativeBuffer.push("");
      continue;
    }

    const match = trimmed.match(DIALOGUE_LINE_RE);
    if (match) {
      flushNarrative();
      blocks.push({
        type: "dialogue",
        speaker: match[1].trim(),
        text: stripOuterQuotes(match[2]),
      });
    } else {
      narrativeBuffer.push(trimmed);
    }
  }

  flushNarrative();
  return blocks;
}

export function hasDialogueBlocks(text) {
  return parseNarrativeBlocks(text).some((block) => block.type === "dialogue");
}
