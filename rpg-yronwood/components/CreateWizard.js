import Head from "next/head";
import { F, Toggle } from "./FormBits";
import AppearanceCreator from "./AppearanceCreator";
import SpecialAbilitySettings from "./SpecialAbilitySettings";
import NarrationSettings from "./NarrationSettings";

/** Assistente de criação de personagem (Mundo → Personagem → Começar). */
export default function CreateWizard({ form, setForm, step, setStep, setView, charSearchLoading, handleStep1Next, finishCreate, gameStyles, steps }) {
  const GAME_STYLES = gameStyles;
  const CREATE_STEPS = steps;
  return (
    <div className="rpg-shell">
      <Head><title>Novo Personagem</title></Head>
      <div className="cr-head">
        <button className="btn-ghost" onClick={() => step > 0 ? setStep(s => s - 1) : setView("home")}>← Voltar</button>
        <nav className="cr-steps" aria-label="Etapas da criação">
          {CREATE_STEPS.map((name, i) => (
            <span key={name} className={`cr-step ${step === i ? "current" : ""} ${step > i ? "done" : ""}`}>
              <span className={`cr-dot ${step >= i ? "on" : ""}`} />
              <span className="cr-step-name">{name}</span>
            </span>
          ))}
        </nav>
        {step === 0
          ? <button className="btn-ghost" type="button" onClick={() => setView("presets")}>RPGs prontos</button>
          : <div style={{ width: 56 }} />}
      </div>

      <div className="cr-body">
        {step === 0 && <>
          <div className="cr-lbl">O mundo</div>

          <F label="Nome do mundo *" value={form.world} set={(v) => setForm(f => ({ ...f, world: v }))} placeholder="ex: Naruto, One Piece, Dark Souls, Mundo Original..." />
          <Toggle title="Universo existente?"
            desc={form.isKnownIP ? "A IA pesquisa um briefing canônico (era, facções, regras de poder). Revise os fatos importantes antes de jogar." : "Mundo original — você define o contexto abaixo"}
            value={form.isKnownIP} onChange={() => setForm(f => ({ ...f, isKnownIP: !f.isKnownIP, storyStartPoint: "" }))} />
          {!form.isKnownIP && <F label="Lore / Contexto *" value={form.worldBg} set={(v) => setForm(f => ({ ...f, worldBg: v }))} placeholder="Época, conflitos, facções, regras do mundo..." ta rows={5} />}
          {form.isKnownIP && form.world.trim() && (
            <div className="ip-hint">A IA vai pesquisar um briefing fiel de <strong>{form.world}</strong>: era, lugares, facções, regras de poder e o que não inventar.</div>
          )}
          <Toggle title="Gerar imagens de cena?"
            desc={form.useImages ? "Uma imagem por cena — mais imersivo, mais lento" : "Sem imagens — mais rápido e barato"}
            value={form.useImages} onChange={() => setForm(f => ({ ...f, useImages: !f.useImages }))} />
          <div style={{ marginBottom: 14 }}>
            <div className="wizard-section-label">Estilo de jogo</div>
            <div className="style-pick">
              {Object.entries(GAME_STYLES).map(([key, s]) => (
                <button
                  key={key}
                  type="button"
                  className={`style-opt ${form.gameStyle === key ? "on" : ""}`}
                  onClick={() => setForm(f => ({ ...f, gameStyle: key }))}
                >
                  <span className="style-opt-title">{s.label}</span>
                  <span className="style-opt-desc">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="btn-primary" disabled={!form.world.trim() || (!form.isKnownIP && !form.worldBg.trim())} onClick={() => setStep(1)}>Próximo</button>
          {(!form.world.trim() || (!form.isKnownIP && !form.worldBg.trim())) ? (
            <p className="field-needed">{!form.world.trim() ? "Falta o nome do mundo." : "Descreva o contexto do mundo original para continuar."}</p>
          ) : null}
        </>}

        {step === 1 && <>
          <div className="cr-lbl">O personagem</div>
          {form.isKnownIP && (
            <div style={{ marginBottom: 14 }}>
              <div className="wizard-section-label">Quem você vai jogar?</div>
              <div className="style-pick">
                <button
                  type="button"
                  className={`style-opt ${form.isExistingChar ? "on" : ""}`}
                  onClick={() => setForm(f => ({ ...f, isExistingChar: true, storyStartPoint: "" }))}
                >
                  <span className="style-opt-title">Personagem da obra</span>
                  <span className="style-opt-desc">Jogo como Naruto, Geralt, Jon Snow... — busco a ficha e você escolhe onde começar na história</span>
                </button>
                <button
                  type="button"
                  className={`style-opt ${!form.isExistingChar ? "on" : ""}`}
                  onClick={() => setForm(f => ({ ...f, isExistingChar: false, charLore: "", charAppearanceNote: "", storyStartPoint: "" }))}
                >
                  <span className="style-opt-title">Personagem original</span>
                  <span className="style-opt-desc">Crio meu próprio personagem neste universo — não precisa existir na obra</span>
                </button>
              </div>
            </div>
          )}
          {form.isExistingChar && form.isKnownIP && (
            <div className="ip-hint">
              Digite o nome do personagem e clique em <strong>Buscar ficha</strong>. A ficha será preenchida automaticamente — no próximo passo você só escolhe <strong>em que momento da história</strong> quer começar.
            </div>
          )}
          {form.isKnownIP && !form.isExistingChar && (
            <div className="ip-hint">
              Seu personagem <strong>não precisa existir na obra</strong> — você define quem é e como entra no universo de <strong>{form.world || "esta história"}</strong>.
            </div>
          )}
          <F label="Nome *" value={form.charName} set={(v) => setForm(f => ({ ...f, charName: v }))} placeholder={form.isExistingChar ? "ex: Naruto, Geralt, Jon Snow..." : "ex: seu personagem..."} />
          {!form.isExistingChar && <>
            <F label="Título / Cargo" value={form.charTitle} set={(v) => setForm(f => ({ ...f, charTitle: v }))} placeholder="ex: Hokage, Witcher, Lorde..." />
            <F label="Idade" value={form.charAge} set={(v) => setForm(f => ({ ...f, charAge: v }))} placeholder="ex: 17" />
            <F label="História / Background" value={form.charBg} set={(v) => setForm(f => ({ ...f, charBg: v }))} placeholder="Origem, motivações, eventos marcantes..." ta rows={4} />
            <F label="Personalidade" value={form.charPersonality} set={(v) => setForm(f => ({ ...f, charPersonality: v }))} placeholder="ex: Impulsivo, corajoso, leal..." />
            <F label="Habilidades / Poderes" value={form.charSkills} set={(v) => setForm(f => ({ ...f, charSkills: v }))} placeholder="ex: espada, liderança... ou um poder único (geralmente secreto no mundo)" />
            {form.isKnownIP && (
              <F label="Quando na história? (opcional)"
                value={form.storyStartPoint}
                set={(v) => setForm(f => ({ ...f, storyStartPoint: v }))}
                placeholder="ex: Durante o Exame Chunin / Após a Batalha de Winterfell / Era dos Piratas..."
                ta rows={2} />
            )}
          </>}
          <button type="button" className="btn-primary" disabled={!form.charName.trim() || charSearchLoading} onClick={handleStep1Next}>
            {charSearchLoading ? "Buscando ficha..." : form.isExistingChar && form.isKnownIP ? "Buscar ficha" : "Próximo"}
          </button>
          {!form.charName.trim() && !charSearchLoading ? <p className="field-needed">Digite o nome do personagem para continuar.</p> : null}
        </>}

        {step === 2 && form.isExistingChar && form.isKnownIP && <>
          <div className="cr-lbl">Onde começar</div>
          <F label="Contexto gerado pela IA — revise antes de jogar" value={form.charLore} set={(v) => setForm(f => ({ ...f, charLore: v }))} ta rows={5} />
          <div className="ficha-card">
            <div className="ficha-name">{form.charName}</div>
            {form.charTitle && <div className="ficha-row"><span>Cargo</span><span>{form.charTitle}{form.charAge ? ` · ${form.charAge} anos` : ""}</span></div>}
            {form.charBg && <div className="ficha-row"><span>História</span><span>{form.charBg}</span></div>}
            {form.charPersonality && <div className="ficha-row"><span>Personalidade</span><span>{form.charPersonality}</span></div>}
            {form.charSkills && <div className="ficha-row"><span>Habilidades</span><span>{form.charSkills}</span></div>}
            {form.charAppearanceNote && <div className="ficha-row"><span>Aparência</span><span>{form.charAppearanceNote}</span></div>}
            {!form.charBg && !form.charPersonality && form.charLore && (
              <div className="ficha-row"><span>Lore</span><span>{form.charLore}</span></div>
            )}
            {form.relationships && Object.keys(form.relationships).length > 0 && (
              <div className="ficha-row">
                <span>Relações</span>
                <span>{Object.entries(form.relationships).slice(0, 6).map(([n, a]) => `${n} (${a})`).join(" · ")}</span>
              </div>
            )}
          </div>
          <F label="Onde na história quer começar? *"
            value={form.storyStartPoint}
            set={(v) => setForm(f => ({ ...f, storyStartPoint: v }))}
            placeholder="ex: Início do anime / Arco do Exame Chunin / Após a Batalha de Winterfell / Depois que vira Hokage..."
            ta rows={3} />
          <div className="ip-hint">Descreva o momento exato da obra em que a aventura começa. O Mestre posicionará seu personagem nesse ponto do canon.</div>
        </>}

        {step === 2 && !(form.isExistingChar && form.isKnownIP) && <>
          <div className="cr-lbl">Revise e comece</div>
          {form.ordinaryCharacter ? <section className="starter-card"><span className="preset-world">{form.world} · Personagem original</span><h2>{form.charName}</h2><p>{form.charTitle}</p><F label="Nome" value={form.charName} set={v => setForm(f => ({ ...f, charName: v }))} /><F label="História" value={form.charBg} set={v => setForm(f => ({ ...f, charBg: v }))} ta rows={3} /><F label="Personalidade" value={form.charPersonality} set={v => setForm(f => ({ ...f, charPersonality: v }))} /><F label="Habilidades" value={form.charSkills} set={v => setForm(f => ({ ...f, charSkills: v }))} ta rows={2} /><F label="Cena inicial" value={form.storyStartPoint} set={v => setForm(f => ({ ...f, storyStartPoint: v }))} ta rows={3} /><p>Personagens ao seu redor: {form.supportingCast}</p></section> : null}
        </>}

        {step === 2 && <>
          <details className="wizard-fold">
            <summary>
              <span>Aparência e retrato</span>
              <span className="wizard-fold-preview">{form.portraitUrl ? "retrato pronto" : `${form.appearance?.presentation || "—"} · cabelo ${form.appearance?.hairColor || "—"} · olhos ${form.appearance?.eyeColor || "—"}`}</span>
            </summary>
            <p className="settings-hint">Opcional. O Mestre usa estes traços nas descrições, e o retrato aparece no chat e na ficha.</p>
            <AppearanceCreator value={form} onChange={(patch) => setForm(f => ({ ...f, ...patch }))} />
          </details>
          <details className="wizard-fold">
            <summary>
              <span>Ajustes da mesa</span>
              <span className="wizard-fold-preview">{form.economyMode ? "economia ligada" : "economia desligada"}</span>
            </summary>
            <p className="settings-hint">Opcional. Depois você muda isso em Ajustes, durante o jogo.</p>
            <label className="economy-setting"><input type="checkbox" checked={Boolean(form.economyMode)} onChange={e => setForm(f => ({ ...f, economyMode: e.target.checked }))} /><span><strong>Modo economia</strong><small>Respostas curtas, instruções compactas e menos chamadas no automático.</small></span></label>
            <SpecialAbilitySettings value={form.specialAbility} onChange={specialAbility => setForm(f => ({ ...f, specialAbility }))} />
            <NarrationSettings value={form.narration} onChange={narration => setForm(f => ({ ...f, narration }))} />
          </details>
          <button
            type="button"
            className="btn-primary"
            disabled={form.isExistingChar && form.isKnownIP && !form.storyStartPoint.trim()}
            onClick={finishCreate}
          >Começar aventura</button>
          {form.isExistingChar && form.isKnownIP && !form.storyStartPoint.trim() ? (
            <p className="field-needed">Diga em que momento da história a aventura começa.</p>
          ) : null}
        </>}
      </div>
    </div>
  );
}
