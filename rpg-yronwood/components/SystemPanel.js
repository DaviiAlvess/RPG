import { useState } from "react";
import { normalizeSystem, SYSTEM_RANKS, asSystemSkills, metaProgress, rankBonus, priceFor, isUnlocked, RANK_BONUS, cartSummary, rewardKind } from "../lib/game-system.mjs";
import TreasureChest from "./TreasureChest";

/** Janela do Sistema: status, missões e loja. */
export default function SystemPanel({ campaign, gameDay = 0, onBuy, onOpenChest, onSearchShop, onCartAdd, onCartRemove, onCartBuyAll, disabled }) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [kindFilter, setKindFilter] = useState("todos");
  const s = normalizeSystem(campaign?.gameSystem);
  if (!s) return null;
  const open = s.quests.filter((q) => !q.done);
  const done = s.quests.filter((q) => q.done);
  const owned = new Set(s.purchased.map((p) => p.id));
  const rankIdx = SYSTEM_RANKS.indexOf(s.rank);
  const inCart = new Set(s.cart.map((i) => i.id));
  // Tipo exibido: habilidade, arma, equipamento ou item (deduzido quando o item não informa).
  const typeOf = (item) => (rewardKind(item) === "habilidade" ? "habilidade" : ["arma", "equipamento"].includes(item.kind) ? item.kind : "item");
  const passes = (item) => kindFilter === "todos" || typeOf(item) === kindFilter;
  const cart = cartSummary(campaign.gameSystem);
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
        <div className="sys-item-tags"><em>Rank {item.tier || "E"}</em><em className={`kind-${typeOf(item)}`}>{typeOf(item)}</em>{item.once ? <em>único</em> : null}</div>
        <p>{item.desc}</p>
        <div className="sys-item-actions">
          <button type="button" className="btn-ghost" disabled={disabled || sold || locked || cant} onClick={() => onBuy(item.id)}>
            {sold ? "Adquirido" : locked ? `Requer Rank ${item.tier}` : cant ? `Faltam ${price - s.points}` : "Comprar"}
          </button>
          {!sold && onCartAdd ? (
            inCart.has(item.id)
              ? <button type="button" className="btn-ghost sys-cart-btn on" onClick={() => onCartRemove(item.id)} title="Tirar do carrinho" aria-label={`Tirar ${item.name} do carrinho`}><i className="ti ti-shopping-cart-x" aria-hidden="true" /><span>No carrinho</span></button>
              : <button type="button" className="btn-ghost sys-cart-btn" onClick={() => onCartAdd(item.id)} title="Guardar para comprar depois" aria-label={`Guardar ${item.name} no carrinho`}><i className="ti ti-shopping-cart-plus" aria-hidden="true" /><span>Guardar</span></button>
          ) : null}
        </div>
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
        {s.cart.length ? (
          <div className="sys-cart">
            <div className="sys-cart-head">
              <span><i className="ti ti-shopping-cart" aria-hidden="true" /> CARRINHO ({s.cart.length})</span>
              <b>Total: {cart.total} pts · você tem {s.points}</b>
            </div>
            <ul className="sys-cart-list">
              {s.cart.map((item) => {
                const locked = !isUnlocked(item, s.rank);
                const sold = item.once && owned.has(item.id);
                const price = priceFor(item, s.rank);
                return (
                  <li key={item.id} className={locked || sold ? "off" : ""}>
                    <span className="sys-cart-name">{item.name} <em>Rank {item.tier || "E"}</em></span>
                    <span className="sys-cart-price">{sold ? "já comprado" : locked ? `requer Rank ${item.tier}` : `${price} pts`}</span>
                    <button type="button" className="btn-ghost" disabled={disabled || locked || sold || s.points < price} onClick={() => onBuy(item.id)}>Comprar</button>
                    <button type="button" className="sys-cart-x" onClick={() => onCartRemove(item.id)} aria-label={`Remover ${item.name} do carrinho`}><i className="ti ti-x" aria-hidden="true" /></button>
                  </li>
                );
              })}
            </ul>
            <button type="button" className="btn-ghost sys-cart-all" disabled={disabled || !cart.buyable.length || !cart.enough} onClick={onCartBuyAll}>
              {cart.enough ? `Comprar tudo (${cart.total} pts)` : `Faltam ${cart.total - s.points} pontos para comprar tudo`}
            </button>
          </div>
        ) : null}
        <form className="sys-search" onSubmit={async (e) => {
          e.preventDefault();
          if (!query.trim() || searching || !onSearchShop) return;
          setSearching(true); setSearchError("");
          try { await onSearchShop(query, kindFilter); } catch (err) { setSearchError(err.message || "A busca falhou."); }
          setSearching(false);
        }}>
          <input className="sys-search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={{ habilidade: "Procure uma habilidade: magia de fogo, visão noturna, esgrima…", arma: "Procure uma arma: espada de fogo, arco longo…", equipamento: "Procure equipamento: armadura leve, cavalo rápido…", item: "Procure um item: poção, mapa, moedas…" }[kindFilter] || "Procure armas, itens ou habilidades: espada de fogo, magia de cura…"} maxLength={80} disabled={disabled || searching} aria-label="Procurar na loja" />
          <button type="submit" className="btn-ghost" disabled={disabled || searching || !query.trim()}>{searching ? "Procurando…" : kindFilter === "habilidade" ? "Procurar habilidade" : "Procurar"}</button>
        </form>
        {searchError ? <p className="sys-empty sys-error">{searchError}</p> : null}
        <div className="sys-kinds" role="group" aria-label="Filtrar por tipo">
          {[["todos", "Todos"], ["habilidade", "Habilidades"], ["arma", "Armas"], ["equipamento", "Equipamentos"], ["item", "Itens"]].map(([id, label]) => {
            const count = id === "todos" ? s.shop.length : s.shop.filter((i) => typeOf(i) === id).length;
            return <button key={id} type="button" className={`sys-kind ${kindFilter === id ? "on" : ""}`} aria-pressed={kindFilter === id} onClick={() => setKindFilter(id)}>{label} <small>{count}</small></button>;
          })}
        </div>
        {s.searchResults.length ? (
          <div className="sys-results">
            <div className="sys-sub">RESULTADOS PARA “{s.lastSearch}”</div>
            <div className="sys-shop">{s.searchResults.filter(passes).map((item) => renderItem(item))}</div>
          </div>
        ) : null}
        {SYSTEM_RANKS.map((tier) => {
          const items = s.shop.filter((i) => (i.tier || "E") === tier && passes(i));
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
