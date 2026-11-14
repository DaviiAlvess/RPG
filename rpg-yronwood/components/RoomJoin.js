import { useEffect, useState } from "react";
import { normalizeRoomCode, isRoomCode, inviteLink, roomTurnName, nameKey, freeSlots } from "../lib/rooms.mjs";

// Sugestões de papel no grupo (o jogador pode escrever outro).
const ROLE_IDEAS = ["Lutador", "Esperto", "Curandeiro", "Líder", "Explorador", "Falador", "Furtivo", "Místico"];
const NEW_CHAR = "__novo";

/** Entrar numa sala online: 1) ver a mesa pelo código, 2) escolher ou criar o próprio personagem. */
export function RoomJoinModal({ initialCode = "", busy = false, onPeek, onJoin, onClose }) {
  const [code, setCode] = useState(normalizeRoomCode(initialCode));
  const [info, setInfo] = useState(null);
  const [peeking, setPeeking] = useState(false);
  const [error, setError] = useState("");
  const [pick, setPick] = useState("");
  const [name, setName] = useState("");
  const [concept, setConcept] = useState("");
  const [role, setRole] = useState("");

  const look = async (value = code) => {
    if (!isRoomCode(value) || !onPeek) return;
    setPeeking(true);
    setError("");
    try {
      const found = await onPeek(value);
      setInfo(found);
      setPick(found.slots?.length ? found.slots[0].name : NEW_CHAR);
    } catch (e) {
      setInfo(null);
      setError(e.message || "Não deu para achar a sala.");
    } finally {
      setPeeking(false);
    }
  };
  // Veio pelo link de convite: já mostra a mesa.
  useEffect(() => { if (isRoomCode(initialCode)) look(normalizeRoomCode(initialCode)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const taken = new Set((info?.members || []).map((m) => nameKey(m.name)));
  const clash = pick === NEW_CHAR && name.trim() && taken.has(nameKey(name));
  const slot = (info?.slots || []).find((s) => s.name === pick);
  const ready = Boolean(info) && !info.full && (info.isMember || slot || (pick === NEW_CHAR && name.trim() && !clash));

  const submit = (e) => {
    e.preventDefault();
    if (busy) return;
    if (!info) { look(); return; }
    if (info.isMember) { onJoin?.({ code }); return; }
    if (!ready) return;
    if (slot) onJoin?.({ code, charName: slot.name });
    else onJoin?.({ code, charName: name.trim(), charConcept: concept.trim(), charRole: role.trim() });
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="room-join-title" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <form className="modal-content room-join" onSubmit={submit}>
        <h2 id="room-join-title"><i className="ti ti-users-group" aria-hidden="true" /> Entrar numa mesa online</h2>
        {!info ? (
          <>
            <p className="panel-sub">Cada amigo joga do próprio celular, com o próprio personagem, e cada um tem a sua vez, como numa mesa de RPG.</p>
            <label className="auth-label" htmlFor="room-code">Código da sala</label>
            <input id="room-code" className="auth-input room-code-input" value={code} onChange={(e) => { setCode(normalizeRoomCode(e.target.value)); setError(""); }} placeholder="EX: K7QM2P" maxLength={6} autoCapitalize="characters" autoComplete="off" required />
            {error ? <p className="room-warning" role="alert">{error}</p> : null}
            <div className="room-join-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={!isRoomCode(code) || peeking}>{peeking ? "Procurando…" : "Ver a mesa"}</button>
            </div>
          </>
        ) : (
          <>
            <div className="room-peek">
              <span>Mesa <strong>{info.room?.title || info.room?.code}</strong> · código {info.room?.code}</span>
              <ul>
                {(info.members || []).map((m) => (
                  <li key={m.seat}><i className={`ti ${m.owner ? "ti-crown" : "ti-user"}`} aria-hidden="true" /> <strong>{m.name}</strong>{m.role ? ` · ${m.role}` : ""}{m.owner ? " (criou a sala)" : ""}</li>
                ))}
              </ul>
            </div>
            {info.isMember ? (
              <p className="panel-sub">Você já está nesta mesa. É só voltar.</p>
            ) : info.full ? (
              <p className="room-warning" role="status">A mesa já está cheia.</p>
            ) : (
              <fieldset className="char-pick">
                <legend>Escolha o seu personagem</legend>
                {(info.slots || []).map((s) => (
                  <label key={s.name} className={`char-option ${pick === s.name ? "on" : ""}`}>
                    <input type="radio" name="char-pick" checked={pick === s.name} onChange={() => setPick(s.name)} />
                    <span><span><strong>{s.name}</strong>{s.role ? <em> · {s.role}</em> : null}</span>{s.concept ? <small>{s.concept}</small> : null}</span>
                  </label>
                ))}
                <label className={`char-option ${pick === NEW_CHAR ? "on" : ""}`}>
                  <input type="radio" name="char-pick" checked={pick === NEW_CHAR} onChange={() => setPick(NEW_CHAR)} />
                  <span><strong>Criar meu próprio personagem</strong><small>Com nome, jeito e papel no grupo.</small></span>
                </label>
                {pick === NEW_CHAR ? (
                  <div className="char-new">
                    <label className="auth-label" htmlFor="room-name">Nome do personagem</label>
                    <input id="room-name" className="auth-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Como o Mestre vai te chamar" required />
                    {clash ? <p className="room-warning" role="alert">Esse personagem já é de outro jogador. Escolha outro nome.</p> : null}
                    <label className="auth-label" htmlFor="room-concept">Quem ele é</label>
                    <input id="room-concept" className="auth-input" value={concept} onChange={(e) => setConcept(e.target.value)} maxLength={200} placeholder="Ex.: mercenário que deve dinheiro a todo mundo" />
                    <label className="auth-label" htmlFor="room-role">Papel no grupo</label>
                    <input id="room-role" className="auth-input" value={role} onChange={(e) => setRole(e.target.value)} maxLength={80} placeholder="Ex.: lutador" />
                    <div className="role-ideas">
                      {ROLE_IDEAS.map((r) => (
                        <button key={r} type="button" className={`chip ${nameKey(role) === nameKey(r) ? "on" : ""}`} onClick={() => setRole(r)}>{r}</button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </fieldset>
            )}
            <div className="room-join-actions">
              <button type="button" className="btn-secondary" onClick={() => { setInfo(null); setError(""); }}>Trocar código</button>
              <button type="submit" className="btn-primary" disabled={busy || (!info.isMember && !ready)}>{busy ? "Entrando…" : info.isMember ? "Voltar para a mesa" : "Entrar na mesa"}</button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

/** Ajustes: criar a sala online desta campanha, convidar e ver quem está jogando. */
export function RoomPanel({ campaign, myUid, busy = false, serverStatus = null, onCreate, onLeave, onSetTurn, onPass, onSetSlots, onNotify }) {
  const c = campaign || {};
  // O servidor já disse que as salas não funcionam: explica em vez de deixar o botão falhar.
  const rooms = serverStatus?.rooms;
  const blocked = Boolean(rooms && !rooms.ok);
  if (!c.roomId) {
    return (
      <div className="room-panel">
        <p className="panel-sub">Jogue online com amigos, cada um no próprio celular. A campanha fica salva na sala e todos veem a mesma história.</p>
        {blocked ? (
          <p className="room-warning" role="status">
            <i className="ti ti-alert-triangle" aria-hidden="true" />{" "}
            {rooms.configured
              ? <>As salas ainda não funcionam neste site: {rooms.detail}</>
              : <>As salas ainda não foram ligadas no servidor. Falta colocar a chave SUPABASE_SECRET_KEY na Vercel e publicar o site de novo.</>}
          </p>
        ) : null}
        <button type="button" className="settings-action" onClick={onCreate} disabled={busy || blocked}>
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
      {c.roomTurnUid === myUid && (c.roomMembers || []).length > 1 && onPass ? (
        <button type="button" className="settings-action" onClick={onPass}><i className="ti ti-player-track-next" /> <span>Passar a minha vez</span></button>
      ) : null}
      {owner && onSetSlots ? <SlotEditor campaign={c} onSave={onSetSlots} /> : null}
      <button type="button" className="settings-action" onClick={onLeave}>
        <i className="ti ti-door-exit" /> <span>{owner ? "Fechar a sala" : "Sair da sala"}</span>
      </button>
    </div>
  );
}

/** Dono da sala: personagens prontos que os amigos podem escolher ao entrar. */
function SlotEditor({ campaign, onSave }) {
  const c = campaign || {};
  const slots = Array.isArray(c.roomSlots) ? c.roomSlots : [];
  const free = freeSlots(slots, c.roomMembers || []);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [concept, setConcept] = useState("");
  const [saving, setSaving] = useState(false);
  const taken = new Set([...(c.roomMembers || []).map((m) => nameKey(m.name)), ...free.map((s) => nameKey(s.name))]);
  const clash = name.trim() && taken.has(nameKey(name));
  const save = async (next) => { setSaving(true); const ok = await onSave(next); setSaving(false); return ok; };
  const add = async (e) => {
    e.preventDefault();
    if (!name.trim() || clash || saving) return;
    if (await save([...free, { name: name.trim(), role: role.trim(), concept: concept.trim() }])) { setName(""); setRole(""); setConcept(""); }
  };
  return (
    <div className="slot-editor">
      <div className="section-label">Personagens para os amigos escolherem</div>
      <p className="panel-sub">Quem entrar escolhe um destes ou cria o próprio. Ninguém fica com o personagem de outro jogador.</p>
      {free.length ? (
        <ul className="room-members">
          {free.map((s) => (
            <li key={s.name}>
              <i className="ti ti-user-plus" aria-hidden="true" />
              <span><strong>{s.name}</strong>{s.role ? ` · ${s.role}` : ""}{s.concept ? <small> — {s.concept}</small> : null}</span>
              <button type="button" className="btn-ghost" disabled={saving} onClick={() => save(free.filter((x) => x.name !== s.name))} aria-label={`Tirar ${s.name} das vagas`}>tirar</button>
            </li>
          ))}
        </ul>
      ) : <p className="settings-hint">Nenhuma vaga pronta: quem entrar cria o próprio personagem.</p>}
      <form className="slot-add" onSubmit={add}>
        <input className="auth-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Nome do personagem" aria-label="Nome do personagem da vaga" />
        <input className="auth-input" value={role} onChange={(e) => setRole(e.target.value)} maxLength={80} placeholder="Papel (ex.: curandeira)" aria-label="Papel no grupo" />
        <input className="auth-input" value={concept} onChange={(e) => setConcept(e.target.value)} maxLength={200} placeholder="Quem é (opcional)" aria-label="Quem é o personagem" />
        {clash ? <p className="room-warning" role="alert">Já existe um personagem com esse nome na mesa.</p> : null}
        <button type="submit" className="settings-action" disabled={!name.trim() || clash || saving}><i className="ti ti-plus" /> <span>{saving ? "Salvando…" : "Adicionar vaga"}</span></button>
      </form>
    </div>
  );
}
