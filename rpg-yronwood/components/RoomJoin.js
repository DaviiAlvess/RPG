import { useState } from "react";
import { normalizeRoomCode, isRoomCode, inviteLink, roomTurnName } from "../lib/rooms.mjs";

/** Entrar numa sala online pelo código (ou pelo link de convite). */
export function RoomJoinModal({ initialCode = "", busy = false, onJoin, onClose }) {
  const [code, setCode] = useState(normalizeRoomCode(initialCode));
  const [name, setName] = useState("");
  const [concept, setConcept] = useState("");
  const ready = isRoomCode(code) && name.trim();
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="room-join-title" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <form className="modal-content room-join" onSubmit={(e) => { e.preventDefault(); if (ready && !busy) onJoin?.({ code, charName: name.trim(), charConcept: concept.trim() }); }}>
        <h2 id="room-join-title"><i className="ti ti-users-group" aria-hidden="true" /> Entrar numa sala online</h2>
        <p className="panel-sub">Cada amigo joga do próprio celular, com o próprio personagem. O Mestre alterna a vez.</p>
        <label className="auth-label" htmlFor="room-code">Código da sala</label>
        <input id="room-code" className="auth-input room-code-input" value={code} onChange={(e) => setCode(normalizeRoomCode(e.target.value))} placeholder="EX: K7QM2P" maxLength={6} autoCapitalize="characters" autoComplete="off" required />
        <label className="auth-label" htmlFor="room-name">Nome do seu personagem</label>
        <input id="room-name" className="auth-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Como o Mestre vai te chamar" required />
        <label className="auth-label" htmlFor="room-concept">Quem ele é (opcional)</label>
        <input id="room-concept" className="auth-input" value={concept} onChange={(e) => setConcept(e.target.value)} maxLength={200} placeholder="Ex.: mercenário de Bravos que deve dinheiro a todo mundo" />
        <div className="room-join-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={!ready || busy}>{busy ? "Entrando…" : "Entrar na sala"}</button>
        </div>
      </form>
    </div>
  );
}

/** Ajustes: criar a sala online desta campanha, convidar e ver quem está jogando. */
export function RoomPanel({ campaign, myUid, busy = false, onCreate, onLeave, onSetTurn, onNotify }) {
  const c = campaign || {};
  if (!c.roomId) {
    return (
      <div className="room-panel">
        <p className="panel-sub">Jogue online com amigos, cada um no próprio celular. A campanha fica salva na sala e todos veem a mesma história.</p>
        <button type="button" className="settings-action" onClick={onCreate} disabled={busy}>
          <i className="ti ti-world-share" /> <span>{busy ? "Criando sala…" : "Criar sala online desta campanha"}</span>
        </button>
      </div>
    );
  }
  const link = typeof window !== "undefined" ? inviteLink(window.location.origin, c.roomCode) : "";
  const share = async () => {
    const text = `Entra na minha mesa de RPG! Código: ${c.roomCode}\n${link}`;
    try {
      if (navigator.share) await navigator.share({ title: "Convite para o RPG", text, url: link });
      else { await navigator.clipboard.writeText(text); onNotify?.("Convite copiado. Mande para o seu amigo."); }
    } catch {}
  };
  const owner = c.roomOwnerUid === myUid;
  const turnName = roomTurnName(c);
  return (
    <div className="room-panel">
      <div className="room-code-box">
        <span>Código da sala</span>
        <strong>{c.roomCode}</strong>
      </div>
      <button type="button" className="settings-action" onClick={share}><i className="ti ti-send" /> <span>Convidar amigos</span></button>
      <ul className="room-members">
        {(c.roomMembers || []).map((m) => (
          <li key={m.uid} className={m.uid === c.roomTurnUid ? "turn" : ""}>
            <i className={`ti ${m.uid === c.roomOwnerUid ? "ti-crown" : "ti-user"}`} aria-hidden="true" />
            <span><strong>{m.name}</strong>{m.uid === myUid ? " (você)" : ""}{m.concept ? <small> — {m.concept}</small> : null}</span>
            {m.uid === c.roomTurnUid ? <em>na vez</em> : owner ? <button type="button" className="btn-ghost" onClick={() => onSetTurn?.(m.uid)}>passar a vez</button> : null}
          </li>
        ))}
      </ul>
      {turnName ? <p className="panel-sub">Agora é a vez de <strong>{turnName}</strong>.</p> : null}
      <button type="button" className="settings-action" onClick={onLeave}>
        <i className="ti ti-door-exit" /> <span>{owner ? "Fechar a sala" : "Sair da sala"}</span>
      </button>
    </div>
  );
}
