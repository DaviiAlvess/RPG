import { useState } from "react";
import { normalizeSystem, SYSTEM_RANKS, asSystemSkills, metaProgress, rankBonus, priceFor, isUnlocked, RANK_BONUS } from "../lib/game-system.mjs";
import TreasureChest from "./TreasureChest";

/** Janela do Sistema: status, missões e loja. */
export default function SystemPanel({ campaign, gameDay = 0, onBuy, onOpenChest, onSearchShop, disabled }) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const s = normalizeSystem(campaign?.gameSystem);
  if (!s) return null;
  const open = s.quests.filter((q) => !q.done);
  const done = s.quests.filter((q) => q.done);
  const owned = new Set(s.purchased.map((p) => p.id));
  const rankIdx = SYSTEM_RANKS.indexOf(s.rank);
  const renderItem = (item) => {
    const sold = item.once && owned.has(item.id);
    const locked = !isUnlocked(item, s.rank);
    const price = priceFor(item, s.rank);
    const cant = s.points < price;
    return (
      <div key={item.id} className={`sys-item tier-${(item.tier || "E").toLowerCase()} ${sold ? "sold" : ""} ${locked ? "locked" : ""}`}>
        <div className="sys-item-head">
          <strong>{item.name}</strong>
          <span>{price !== item.cost ? <s>{item.cost}</s> : null} {price} pts</span>
        </div>
        <div className="sys-item-tags"><em>Rank {item.tier || "E"}</em>{item.kind ? <em>{item.kind}</em> : null}{item.once ? <em>único</em> : null}</div>
        <p>{item.desc}</p>
        <button type="button" className="btn-ghost" disabled={disabled || sold || locked || cant} onClick={() => onBuy(item.id)}>
          {sold ? "Adquirido" : locked ? `Requer Rank ${item.tier}` : cant ? `Faltam ${price - s.points}` : "Comprar"}
        </button>
      </div>
    );
  };

  return (
    <div className="sys">
      <section className="sys-window">
        <div className="sys-title">【{s.name}】</div>
        <div className="sys-status">
          <div><span>Usuário</span><strong>{campaign.charName}</strong></div>
          <div><span>Nível</span><strong className="sys-rank">{s.level}</strong></div>
          <div><span>Rank</span><strong className="sys-rank">{s.rank}</strong></div>
          <div><span>Pontos para gastar</span><strong>{s.points}</strong></div>
          <div><span>Abates</span><strong>{s.kills}</strong></div>
        </div>
        {(() => { const m = metaProgress(campaign.gameSystem); return m ? (
          <div className="sys-meta">
            <div className="sys-meta-head"><span>META DO NÍVEL {m.level + 1}</span><b>{m.earned} / {m.next} pontos ganhos</b></div>
            <div className="sys-meta-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(m.pct)}><span style={{ width: `${m.pct}%` }} /></div>
            <small>Faltam {m.left}. Abates e ações dão pontos; gastar na loja não tira nível.</small>
          </div>
        ) : null; })()}
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
        <div className="sys-sub">BÔNUS DO RANK {s.rank}</div>
        <p className="sys-bonus">{rankBonus(s.rank).label}</p>
        <div className="sys-rank-ladder">
          {SYSTEM_RANKS.map((r) => (
            <div key={r} className={`sys-ladder-step ${r === s.rank ? "now" : SYSTEM_RANKS.indexOf(r) < rankIdx ? "past" : ""}`}>
              <b>{r}</b><span>{r === "E" ? "base" : `-${Math.round(RANK_BONUS[r].discount * 100)}% · ×${RANK_BONUS[r].mult}`}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sys-window">
        <div className="sys-sub">LOJA</div>
        <form className="sys-search" onSubmit={async (e) => {
          e.preventDefault();
          if (!query.trim() || searching || !onSearchShop) return;
          setSearching(true); setSearchError("");
          try { await onSearchShop(query); } catch (err) { setSearchError(err.message || "A busca falhou."); }
          setSearching(false);
        }}>
          <input className="sys-search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Procure qualquer coisa: espada de fogo, cavalo rápido, magia de cura…" maxLength={80} disabled={disabled || searching} aria-label="Procurar na loja" />
          <button type="submit" className="btn-ghost" disabled={disabled || searching || !query.trim()}>{searching ? "Procurando…" : "Procurar"}</button>
        </form>
        {searchError ? <p className="sys-empty sys-error">{searchError}</p> : null}
        {s.searchResults.length ? (
          <div className="sys-results">
            <div className="sys-sub">RESULTADOS PARA “{s.lastSearch}”</div>
            <div className="sys-shop">{s.searchResults.map((item) => renderItem(item))}</div>
          </div>
        ) : null}
        {SYSTEM_RANKS.map((tier) => {
          const items = s.shop.filter((i) => (i.tier || "E") === tier);
          if (!items.length) return null;
          const open = isUnlocked({ tier }, s.rank);
          return (
            <div key={tier} className={`sys-tier ${open ? "" : "locked"}`}>
              <div className="sys-tier-head"><b>RANK {tier}</b>{open ? null : <span><i className="ti ti-lock" aria-hidden="true" /> desbloqueia no Rank {tier}</span>}</div>
              <div className="sys-shop">{items.map((item) => renderItem(item))}</div>
            </div>
          );
        })}
        <p className="sys-empty">Itens e armas vão direto para o inventário; habilidades, para a Ficha. Só você sabe de onde vieram. Subir de rank libera itens novos e desconto maior.</p>
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
