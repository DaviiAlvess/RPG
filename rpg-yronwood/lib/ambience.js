// ─── Ambiente sonoro ──────────────────────────────────────────────────
// Trilha ambiente sintetizada no navegador (Web Audio): sem arquivos de música,
// sem rede. Um clima por tom da história; a tensão abre o filtro e acelera o pulso.

export const AMBIENCE_MOODS = {
  terror:   { label: "Terror",   root: 41.2,  chord: [0, 1, 6],      wave: "sawtooth", cutoff: 260, noise: 0.05, pulse: 0,    pluck: "dissonant" },
  misterio: { label: "Mistério", root: 55,    chord: [0, 3, 7, 10],  wave: "triangle", cutoff: 700, noise: 0.012, pulse: 0,   pluck: "minor" },
  aventura: { label: "Aventura", root: 65.41, chord: [0, 7, 12, 16], wave: "triangle", cutoff: 1100, noise: 0.006, pulse: 0,  pluck: "major" },
  acao:     { label: "Ação",     root: 49,    chord: [0, 7, 12, 15], wave: "sawtooth", cutoff: 900, noise: 0.01, pulse: 0.48, pluck: "" },
  intriga:  { label: "Intriga",  root: 58.27, chord: [0, 3, 7, 14],  wave: "triangle", cutoff: 650, noise: 0.008, pulse: 0,   pluck: "minor" },
  leve:     { label: "Leve",     root: 73.42, chord: [0, 4, 7, 12],  wave: "sine",     cutoff: 1600, noise: 0, pulse: 0,      pluck: "major" },
};

const TONE_TO_MOOD = { Terror: "terror", "Mistério": "misterio", Aventura: "aventura", "Ação": "acao", Intriga: "intriga", Leve: "leve" };
const STYLE_TO_MOOD = { terror: "terror", horror: "terror", acao: "acao", misterio: "misterio", intriga: "intriga", aventura: "aventura" };
const SCALES = { major: [0, 2, 4, 7, 9, 12, 14, 16], minor: [0, 3, 5, 7, 10, 12, 15], dissonant: [0, 1, 6, 11, 13, 18] };

/** Escolhe o clima a partir da campanha (tom do preset, estilo de jogo, narração). */
export function moodForCampaign(c = {}) {
  if (TONE_TO_MOOD[c.tone]) return TONE_TO_MOOD[c.tone];
  if (STYLE_TO_MOOD[c.gameStyle]) return STYLE_TO_MOOD[c.gameStyle];
  if (c.narration?.style === "dark") return "terror";
  if (c.narration?.style === "light") return "leve";
  return "aventura";
}

const hz = (root, semis) => root * Math.pow(2, semis / 12);

export function createAmbience() {
  let ctx = null;
  let master = null;
  let nodes = [];
  let timers = [];
  let mood = "aventura";
  let tension = 0;
  let volume = 0.5;
  let filter = null;

  const stopVoices = () => {
    timers.forEach(clearInterval);
    timers = [];
    const now = ctx ? ctx.currentTime : 0;
    nodes.forEach((n) => { try { n.stop?.(now + 1.6); } catch {} });
    nodes = [];
  };

  const build = () => {
    const m = AMBIENCE_MOODS[mood] || AMBIENCE_MOODS.aventura;
    const now = ctx.currentTime;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, now);
    bus.gain.linearRampToValueAtTime(1, now + 3);
    filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = m.cutoff * (1 + tension * 0.45);
    filter.Q.value = 0.7;
    bus.connect(filter).connect(master);

    // Pad: acorde com osciladores levemente desafinados, filtro "respirando".
    m.chord.forEach((semi, i) => {
      [-6, 6].forEach((detune) => {
        const o = ctx.createOscillator();
        o.type = m.wave;
        o.frequency.value = hz(m.root * 2, semi);
        o.detune.value = detune + i * 2;
        const g = ctx.createGain();
        g.gain.value = 0.05 / m.chord.length;
        o.connect(g).connect(bus);
        o.start(now);
        nodes.push(o);
      });
    });
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = m.cutoff * 0.35;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start(now);
    nodes.push(lfo);

    // Grave sustentado.
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = m.root;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.08;
    sub.connect(subGain).connect(bus);
    sub.start(now);
    nodes.push(sub);

    // Vento/ruído.
    if (m.noise) {
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; data[i] = last * 3.5; }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const ng = ctx.createGain();
      ng.gain.value = m.noise * 4;
      src.connect(ng).connect(bus);
      src.start(now);
      nodes.push(src);
    }

    // Pulso (ação): batida grave que acelera com a tensão.
    if (m.pulse) {
      const beat = () => {
        if (!ctx) return;
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(m.root * 2, t);
        o.frequency.exponentialRampToValueAtTime(m.root, t + 0.18);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.connect(g).connect(bus);
        o.start(t);
        o.stop(t + 0.32);
      };
      timers.push(setInterval(beat, Math.max(260, m.pulse * 1000 - tension * 70)));
    }

    // Notas soltas, raras, para dar vida.
    if (m.pluck) {
      const scale = SCALES[m.pluck];
      const pluck = () => {
        if (!ctx || Math.random() < 0.35) return;
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = hz(m.root * 8, scale[Math.floor(Math.random() * scale.length)]);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.035, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
        o.connect(g).connect(bus);
        o.start(t);
        o.stop(t + 2.6);
      };
      timers.push(setInterval(pluck, 2600));
    }
  };

  return {
    get playing() { return Boolean(ctx && ctx.state === "running"); },
    get mood() { return mood; },
    async start(nextMood = mood) {
      const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
      if (!AC) return false;
      if (!ctx) {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = volume * 0.6;
        const comp = ctx.createDynamicsCompressor();
        master.connect(comp).connect(ctx.destination);
      }
      if (ctx.state === "suspended") await ctx.resume();
      mood = AMBIENCE_MOODS[nextMood] ? nextMood : "aventura";
      stopVoices();
      build();
      return true;
    },
    setMood(nextMood) {
      if (!AMBIENCE_MOODS[nextMood] || nextMood === mood) return;
      mood = nextMood;
      if (ctx && ctx.state === "running") { stopVoices(); build(); }
    },
    setTension(level) {
      tension = Math.max(0, Math.min(3, Number(level) || 0));
      const m = AMBIENCE_MOODS[mood];
      if (filter && ctx) filter.frequency.setTargetAtTime(m.cutoff * (1 + tension * 0.45), ctx.currentTime, 2);
      if (m.pulse && ctx && ctx.state === "running") { stopVoices(); build(); }
    },
    setVolume(v) {
      volume = Math.max(0, Math.min(1, Number(v)));
      if (master && ctx) master.gain.setTargetAtTime(volume * 0.6, ctx.currentTime, 0.3);
    },
    async stop() {
      if (!ctx) return;
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      stopVoices();
      const c = ctx;
      ctx = null;
      setTimeout(() => c.close().catch(() => {}), 1800);
    },
  };
}
