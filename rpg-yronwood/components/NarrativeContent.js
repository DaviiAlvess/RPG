import { parseNarrativeBlocks, speakerToneIndex } from "../lib/dialogueFormat";

function isPlayerSpeaker(speaker, playerName) {
  const name = String(speaker || "").trim();
  if (!name) return false;
  if (/^você$/i.test(name)) return true;
  return Boolean(playerName) && name.toLowerCase() === String(playerName).toLowerCase();
}

export default function NarrativeContent({ text, playerName }) {
  const blocks = parseNarrativeBlocks(text);
  const hasDialogue = blocks.some((block) => block.type === "dialogue");

  if (!blocks.length) return text || null;

  if (!hasDialogue) {
    return <p className="narrative-prose">{blocks.map((b) => b.text).join("\n\n")}</p>;
  }

  return (
    <div className="narrative-content">
      {blocks.map((block, index) => {
        if (block.type === "dialogue") {
          const isPlayer = isPlayerSpeaker(block.speaker, playerName);
          const tone = isPlayer ? null : speakerToneIndex(block.speaker);
          const className = isPlayer
            ? "dialogue-line dialogue-line-player"
            : `dialogue-line dialogue-tone-${tone}`;
          return (
            <div
              key={`dlg-${index}`}
              className={className}
              data-speaker={block.speaker}
            >
              <span className="dialogue-speaker">{block.speaker}</span>
              <span className="dialogue-text">&ldquo;{block.text}&rdquo;</span>
            </div>
          );
        }
        return (
          <p key={`nar-${index}`} className="narrative-prose">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
