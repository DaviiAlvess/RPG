import { useState } from "react";
import { chestStatus, formatWaitDays, rewardKind } from "../lib/game-system.mjs";

const KIND_LABEL = { arma: "Arma", habilidade: "Habilidade", equipamento: "Equipamento", item: "Item" };

/** Ícone do baú em SVG; a tampa é um grupo separado para a animação de abrir. */
export function ChestIcon({ size = 96, open = false }) {
  return (
    <svg className={`chest-svg ${open ? "is-open" : ""}`} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id="chestWood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a5a2b" /><stop offset="1" stopColor="#5a3415" />
        </linearGradient>
        <linearGradient id="chestGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe28a" /><stop offset="1" stopColor="#c8901e" />
        </linearGradient>
        <radialGradient id="chestGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#bfe3ff" stopOpacity="1" /><stop offset="1" stopColor="#6db4ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse className="chest-light" cx="60" cy="58" rx="50" ry="40" fill="url(#chestGlow)" />
      <g className="chest-base">
        <rect x="18" y="56" width="84" height="46" rx="6" fill="url(#chestWood)" stroke="#3a210c" strokeWidth="3" />
        <rect x="18" y="66" width="84" height="7" fill="url(#chestGold)" />
        <rect x="30" y="56" width="8" height="46" fill="url(#chestGold)" />
        <rect x="82" y="56" width="8" height="46" fill="url(#chestGold)" />
        <rect x="52" y="62" width="16" height="18" rx="3" fill="url(#chestGold)" stroke="#7a5410" strokeWidth="2" />
        <circle cx="60" cy="70" r="3" fill="#3a210c" />
      </g>
      <g className="chest-lid">
        <path d="M18 58 V44 Q18 22 60 22 Q102 22 102 44 V58 Z" fill="url(#chestWood)" stroke="#3a210c" strokeWidth="3" />
        <path d="M30 56 V33 Q34 27 38 26 V56 Z M82 56 V26 Q86 27 90 33 V56 Z" fill="url(#chestGold)" />
        <rect x="18" y="50" width="84" height="7" fill="url(#chestGold)" />
      </g>
      <g className="chest-sparkles" fill="#fff">
        <circle cx="30" cy="20" r="2" /><circle cx="92" cy="16" r="2.5" /><circle cx="60" cy="8" r="2" /><circle cx="104" cy="40" r="1.6" /><circle cx="14" cy="38" r="1.6" />
      </g>
    </svg>
  );
}

/** Cartão do baú semanal: pronto (brilhando), abrindo (animação) ou aguardando. */
export default function TreasureChest({ system, gameDay = 0, onOpen, disabled }) {
  const [phase, setPhase] = useState("idle");
  const [reward, setReward] = useState(null);
  const status = chestStatus(system, gameDay);

  const open = () => {
    if (phase !== "idle" || !status.ready || disabled) return;
    setPhase("shaking");
    setTimeout(() => {
      const r = onOpen();
      if (!r) { setPhase("idle"); return; }
      setReward(r);
      setPhase("opening");
      setTimeout(() => setPhase("revealed"), 900);
    }, 900);
  };

  return (
    <section className={`sys-window chest-card phase-${phase} ${status.ready ? "ready" : "locked"}`}>
      <div className="sys-sub">BAÚ SEMANAL</div>
      <button type="button" className="chest-btn" onClick={open} disabled={!status.ready || disabled || phase !== "idle"} aria-label={status.ready ? "Abrir o baú semanal" : "Baú trancado"}>
        <ChestIcon size={120} open={phase === "opening" || phase === "revealed"} />
      </button>
      {phase === "revealed" && reward ? (
        <div className="chest-reward" role="status">
          <span className="chest-kind">{KIND_LABEL[reward.kind] || "Recompensa"}</span>
          <strong>{reward.name}</strong>
          <p>{reward.desc}</p>
          <small>{rewardKind(reward) === "habilidade" ? "Nova habilidade adicionada à sua Ficha." : "Guardado no seu inventário."}</small>
        </div>
      ) : status.ready ? (
        <p className="chest-hint">Uma recompensa grátis te espera: arma, habilidade ou item deste mundo. Toque no baú. Um novo baú aparece a cada semana da história.</p>
      ) : (
        <p className="chest-hint"><i className="ti ti-lock" aria-hidden="true" /> Próximo baú em <strong>{formatWaitDays(status.daysLeft)}</strong> no calendário da história.</p>
      )}
    </section>
  );
}
