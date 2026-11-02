import { normalizeSystem, SYSTEM_RANKS, asSystemSkills } from "../lib/game-system.mjs";
import TreasureChest from "./TreasureChest";

/** Janela do Sistema: status, missões e loja. */
export default function SystemPanel({ campaign, gameDay = 0, onBuy, onOpenChest, disabled }) {
  const s = normalizeSystem(campaign?.gameSystem);
  if (!s) return null;
  const open = s.quests.filter((q) => !q.done);
  const done = s.quests.filter((q) => q.done);
  const owned = new Set(s.purchased.map((p) => p.id));
  const rankIdx = SYSTEM_RANKS.indexOf(s.rank);

  return (
    <div className="sys">
      <section className="sys-window">
        <div className="sys-title">【{s.name}】</div>
        <div className="sys-status">
          <div><span>Usuário</span><strong>{campaign.charName}</strong></div>
          <div><span>Rank</span><strong className="sys-rank">{s.rank}</strong></div>
          <div><span>Pontos</span><strong>{s.points}</strong></div>
          <div><span>Total ganho</span><strong>{s.earned}</strong></div>
        </div>
        <div className="sys-ranks" aria-label={`Rank ${s.rank}`}>
          {SYSTEM_RANKS.map((r, i) => <span key={r} className={i <= rankIdx ? "on" : ""}>{r}</span>)}
        </div>
      </section>

      <TreasureChest system={campaign.gameSystem} gameDay={gameDay} onOpen={onOpenChest} disabled={disabled} />

      <section className="sys-window">
        <div className="sys-sub">MISSÕES</div>
        {open.length ? open.map((q) => (
          <div key={q.id} className="sys-quest"><i className="ti ti-target-arrow" aria-hidden="true" /> <span>{q.text}</span><b>+{q.reward}</b></div>
        )) : <p className="sys-empty">Nenhuma missão ativa. O Sistema observa.</p>}
        {done.length ? <details className="sys-done"><summary>Cumpridas ({done.length})</summary>{done.map((q) => <div key={q.id} className="sys-quest done"><i className="ti ti-check" /> <span>{q.text}</span><b>+{q.reward}</b></div>)}</details> : null}
      </section>

      {asSystemSkills(campaign.systemSkills).length ? (
        <section className="sys-window">
          <div className="sys-sub">SUAS HABILIDADES</div>
          {asSystemSkills(campaign.systemSkills).map((sk) => (
            <div key={sk.name} className="sys-quest"><i className="ti ti-bolt" aria-hidden="true" /> <span><strong>{sk.name}</strong> — {sk.desc}</span></div>
          ))}
        </section>
      ) : null}

      <section className="sys-window">
        <div className="sys-sub">LOJA</div>
        <div className="sys-shop">
          {s.shop.map((item) => {
            const sold = item.once && owned.has(item.id);
            const cant = s.points < item.cost;
            return (
              <div key={item.id} className={`sys-item ${sold ? "sold" : ""}`}>
                <div className="sys-item-head"><strong>{item.name}</strong><span>{item.cost} pts</span></div>
                <p>{item.desc}</p>
                <button type="button" className="btn-ghost" disabled={disabled || sold || cant} onClick={() => onBuy(item.id)}>
                  {sold ? "Adquirido" : cant ? `Faltam ${item.cost - s.points}` : "Comprar"}
                </button>
              </div>
            );
          })}
        </div>
        <p className="sys-empty">Itens e armas vão direto para o inventário; habilidades, para a Ficha. Só você sabe de onde vieram.</p>
      </section>

      {s.log.length ? (
        <section className="sys-window">
          <div className="sys-sub">REGISTRO</div>
          <ul className="sys-log">{[...s.log].reverse().map((l, i) => <li key={i}>{l}</li>)}</ul>
        </section>
      ) : null}
    </div>
  );
}
