import { parseNarrativeBlocks, speakerToneIndex } from "../lib/dialogueFormat";

const plain = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Nomes pelos quais o jogador pode aparecer: completo, primeiro nome e o nome do corpo ("no corpo de X"). */
export function playerAliases(playerName) {
  const full = plain(playerName);
  if (!full) return [];
  const outside = full.replace(/\(.*\)/, "").trim();
  const inside = (full.match(/\(\s*(?:no corpo de|como)\s+([^)]+)\)/) || [])[1] || "";
  const names = [full, outside, inside].map((n) => n.trim()).filter(Boolean);
  return [...new Set([...names, ...names.map((n) => n.split(/[\s,]+/)[0])])].filter((n) => n.length >= 2);
}

function isPlayerSpeaker(speaker, playerName) {
  const name = plain(speaker);
  if (!name) return false;
  if (name === "voce") return true;
  return playerAliases(playerName).includes(name);
}

function isStageDirection(text, neighborsHaveDialogue) {
  if (!neighborsHaveDialogue) return false;
  const line = String(text || "").trim();
  if (!line) return false;
  if (line.length > 110) return false;
  if (line.includes("\n")) return false;
  return true;
}

function SpeakerAvatar({ speaker, url, tone }) {
  if (url) {
    return (
      <img
        className="dialogue-avatar"
        src={url}
        alt=""
        width={40}
        height={40}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={(e) => { e.currentTarget.replaceWith(Object.assign(document.createElement("span"), { className: `dialogue-avatar dialogue-initial tone-${tone ?? "p"}`, textContent: String(speaker || "?").trim().charAt(0).toUpperCase() })); }}
      />
    );
  }
  return <span className={`dialogue-avatar dialogue-initial tone-${tone ?? "p"}`} aria-hidden="true">{String(speaker || "?").trim().charAt(0).toUpperCase()}</span>;
}

/**
 * Texto do Mestre: prosa e falas. `portraitFor(nome)` devolve o retrato de quem fala
 * (jogador ou NPC conhecido); sem retrato, aparece a inicial na cor do personagem.
 */
export default function NarrativeContent({ text, playerName, portraitFor }) {
  const blocks = parseNarrativeBlocks(text);
  const hasDialogue = blocks.some((block) => block.type === "dialogue");

  if (!blocks.length) return text || null;

  if (!hasDialogue) {
    return <p className="narrative-prose">{blocks.map((b) => b.text).join("\n\n")}</p>;
  }

  return (
    <div className="narrative-content narrative-conversation" role="group" aria-label="Conversa na cena">
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
              <SpeakerAvatar speaker={block.speaker} url={portraitFor ? portraitFor(block.speaker, isPlayer) : null} tone={tone} />
              <div className="dialogue-body">
                <span className="dialogue-speaker">{block.speaker}</span>
                <span className="dialogue-text">&ldquo;{block.text}&rdquo;</span>
              </div>
            </div>
          );
        }
        const stage = isStageDirection(block.text, true);
        return (
          <p
            key={`nar-${index}`}
            className={stage ? "narrative-prose scene-stage" : "narrative-prose"}
          >
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
