import { parseNarrativeBlocks } from "../lib/dialogueFormat";

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
          const isPlayer =
            playerName &&
            block.speaker.toLowerCase() === playerName.toLowerCase();
          return (
            <div
              key={`dlg-${index}`}
              className={`dialogue-line${isPlayer ? " dialogue-line-player" : ""}`}
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
