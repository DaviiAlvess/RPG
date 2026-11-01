import { asClueList, asChoiceList, asChapterList } from "../lib/story-progress.mjs";
import { asPlaceList, achievementView } from "../lib/codex.mjs";
import { npcPortraitUrl } from "../lib/appearance.mjs";

const ATTITUDE_CLASS = { "Amigável": "ally", Hostil: "enemy", Suspeito: "wary", Neutral: "neutral" };

/** Enciclopédia da campanha: capítulos, pessoas, lugares, pistas, decisões e conquistas. */
export default function CodexPanel({ campaign }) {
  const c = campaign || {};
  const chapters = asChapterList(c.chapters);
  const places = asPlaceList(c.places);
  const clues = asClueList(c.clues);
  const choices = asChoiceList(c.choices);
  const npcs = c.worldState?.npcs || {};
  const rel = c.relationships || {};
  const people = [...new Set([...Object.keys(npcs), ...Object.keys(rel)])];
  const achievements = achievementView(c);
  const unlocked = achievements.filter((a) => a.unlocked).length;
  const current = c.worldState?.location || "";

  return (
    <div className="codex">
      <section className="card-box codex-section">
        <div className="section-label">Capítulos</div>
        <ol className="codex-chapters">
          <li><span>1</span> O começo</li>
          {chapters.map((ch, i) => <li key={ch.title}><span>{i + 2}</span> {ch.title}</li>)}
        </ol>
        {!chapters.length ? <p className="panel-sub">O Mestre marca um novo capítulo quando a história vira a página.</p> : null}
      </section>

      <section className="card-box codex-section">
        <div className="section-label">Pessoas ({people.length})</div>
        {people.length ? (
          <div className="codex-people">
            {people.map((name) => (
              <div key={name} className="codex-person">
                {c.useImages !== false ? <img src={npcPortraitUrl(name, npcs[name] || "", c.world, c.portraitStyle)} alt="" width={52} height={52} loading="lazy" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} /> : null}
                <div>
                  <div className="codex-person-name">
                    {name}
                    {rel[name] ? <span className={`codex-attitude ${ATTITUDE_CLASS[rel[name]] || ""}`}>{rel[name]}</span> : null}
                  </div>
                  {npcs[name] ? <p>{npcs[name]}</p> : null}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="panel-sub">Quem você conhecer aparece aqui.</p>}
      </section>

      <section className="card-box codex-section">
        <div className="section-label">Lugares ({places.length || (current ? 1 : 0)})</div>
        <ol className="codex-places">
          {(places.length ? places : current ? [{ name: current }] : []).map((p) => (
            <li key={p.name} className={p.name === current ? "here" : ""}>
              <i className={`ti ${p.name === current ? "ti-map-pin-filled" : "ti-map-pin"}`} aria-hidden="true" /> {p.name}
              {p.name === current ? <span className="codex-here">você está aqui</span> : null}
            </li>
          ))}
        </ol>
      </section>

      <div className="codex-columns">
        <section className="card-box codex-section">
          <div className="section-label">Pistas ({clues.length})</div>
          {clues.length ? <ul className="codex-list">{clues.map((k) => <li key={k.id}>{k.text}</li>)}</ul> : <p className="panel-sub">Nenhuma ainda.</p>}
        </section>
        <section className="card-box codex-section">
          <div className="section-label">Suas decisões ({choices.length})</div>
          {choices.length ? <ul className="codex-list">{choices.map((k) => <li key={k.id}>{k.text}</li>)}</ul> : <p className="panel-sub">Decisões que mudam a história ficam registradas — e podem voltar.</p>}
        </section>
      </div>

      <section className="card-box codex-section">
        <div className="section-label">Conquistas ({unlocked}/{achievements.length})</div>
        <div className="codex-achievements">
          {achievements.map((a) => (
            <div key={a.id} className={`codex-achievement ${a.unlocked ? "on" : ""}`} title={a.unlocked ? a.desc : "Ainda bloqueada"}>
              <i className={`ti ${a.unlocked ? a.icon : "ti-lock"}`} aria-hidden="true" />
              <div>
                <strong>{a.title}</strong>
                <span>{a.unlocked ? a.desc : "???"}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
