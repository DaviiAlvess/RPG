// ─── Narração por voz ─────────────────────────────────────────────────
// Usa a síntese de voz do navegador (Web Speech API): grátis, sem servidor.
// O texto é limpo e dividido em trechos curtos, porque alguns navegadores
// cortam falas longas no meio.

export const VOICE_PREF_KEY = "rpg-voice";
export const DEFAULT_VOICE_PREFS = { auto: false, voiceURI: "", rate: 1, pitch: 1 };

/** Remove marcações e símbolos que soam mal quando lidos em voz alta. */
export function textForSpeech(text) {
  return String(text || "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[*_#`~>|]/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ")
    .replace(/—/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Divide em trechos de até `max` caracteres, preferindo cortar no fim de frases. */
export function chunkForSpeech(text, max = 220) {
  const clean = textForSpeech(text);
  if (!clean) return [];
  const sentences = clean.match(/[^.!?…]+[.!?…]+["”»']?|[^.!?…]+$/g) || [clean];
  const chunks = [];
  let current = "";
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (s.length > max) {
      if (current) { chunks.push(current); current = ""; }
      for (let i = 0; i < s.length; i += max) {
        let piece = s.slice(i, i + max);
        const cut = piece.lastIndexOf(", ");
        if (i + max < s.length && cut > max * 0.5) { piece = piece.slice(0, cut + 1); i -= max - (cut + 2); }
        chunks.push(piece.trim());
      }
      continue;
    }
    if ((current + " " + s).trim().length > max) { chunks.push(current); current = s; }
    else current = (current + " " + s).trim();
  }
  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

/** Vozes em português primeiro (pt-BR antes de pt-PT), depois as demais. */
export function sortVoices(voices = []) {
  const score = (v) => (/^pt-BR/i.test(v.lang) ? 0 : /^pt/i.test(v.lang) ? 1 : 2);
  return [...voices].sort((a, b) => score(a) - score(b) || String(a.name).localeCompare(String(b.name)));
}

export function pickVoice(voices = [], preferredURI = "") {
  if (!voices.length) return null;
  return voices.find((v) => v.voiceURI === preferredURI) || sortVoices(voices)[0];
}

export function readVoicePrefs(storage) {
  try {
    const raw = JSON.parse(storage?.getItem(VOICE_PREF_KEY) || "{}");
    return {
      auto: Boolean(raw.auto),
      voiceURI: String(raw.voiceURI || ""),
      rate: Math.min(1.6, Math.max(0.6, Number(raw.rate) || 1)),
      pitch: Math.min(1.5, Math.max(0.5, Number(raw.pitch) || 1)),
    };
  } catch {
    return { ...DEFAULT_VOICE_PREFS };
  }
}

/** Narrador único da página: falar uma nova mensagem cancela a anterior. */
/** Hash estável do nome: o mesmo personagem sempre recebe a mesma voz. */
const nameHash = (name) => {
  let h = 0;
  for (const ch of String(name || "").toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
};

/**
 * Voz de cada fala: o narrador usa a voz escolhida; cada personagem ganha uma voz
 * própria (outra voz em português, se houver) e um tom diferente, sempre o mesmo.
 */
export function speakerVoice(speaker, voices = [], prefs = DEFAULT_VOICE_PREFS) {
  const base = pickVoice(voices, prefs.voiceURI);
  if (!speaker) return { voice: base, pitch: prefs.pitch || 1, rate: prefs.rate || 1 };
  const h = nameHash(speaker);
  const pt = sortVoices(voices).filter((v) => /^pt/i.test(v.lang || ""));
  const pool = pt.length > 1 ? pt : [];
  const voice = pool.length ? pool[h % pool.length] : base;
  const pitches = [0.8, 0.9, 1.1, 1.2, 1.3, 0.85, 1.15];
  const pitch = Math.min(1.5, Math.max(0.5, (prefs.pitch || 1) * pitches[h % pitches.length]));
  const rate = Math.min(1.6, Math.max(0.6, (prefs.rate || 1) * (0.94 + (h % 5) * 0.03)));
  return { voice, pitch, rate };
}

export function createNarrator(synth = typeof window !== "undefined" ? window.speechSynthesis : null, Utterance = typeof window !== "undefined" ? window.SpeechSynthesisUtterance : null) {
  let token = 0;
  const listeners = new Set();
  let speaking = false;
  const emit = (value) => { speaking = value; listeners.forEach((fn) => fn(value)); };

  return {
    supported: Boolean(synth && Utterance),
    get speaking() { return speaking; },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    voices() { return synth ? sortVoices(synth.getVoices()) : []; },
    stop() { token++; if (synth) synth.cancel(); emit(false); },
    /** Lê partes em sequência: [{ text, speaker }] — narração na voz do narrador, falas na voz de cada um. */
    speakSegments(segments = [], prefs = DEFAULT_VOICE_PREFS) {
      if (!synth || !Utterance) return false;
      const all = synth.getVoices();
      const parts = [];
      for (const seg of segments) {
        const plan = speakerVoice(seg.speaker, all, prefs);
        for (const chunk of chunkForSpeech(seg.text)) parts.push({ chunk, ...plan });
      }
      if (!parts.length) return false;
      const my = ++token;
      synth.cancel();
      emit(true);
      parts.forEach((p, i) => {
        const u = new Utterance(p.chunk);
        if (p.voice) { u.voice = p.voice; u.lang = p.voice.lang; } else u.lang = "pt-BR";
        u.rate = p.rate;
        u.pitch = p.pitch;
        if (i === parts.length - 1) u.onend = () => { if (my === token) emit(false); };
        u.onerror = () => { if (my === token) emit(false); };
        synth.speak(u);
      });
      return true;
    },
    speak(text, prefs = DEFAULT_VOICE_PREFS) {
      if (!synth || !Utterance) return false;
      const chunks = chunkForSpeech(text);
      if (!chunks.length) return false;
      const my = ++token;
      synth.cancel();
      const voice = pickVoice(synth.getVoices(), prefs.voiceURI);
      emit(true);
      chunks.forEach((chunk, i) => {
        const u = new Utterance(chunk);
        if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = "pt-BR";
        u.rate = prefs.rate || 1;
        u.pitch = prefs.pitch || 1;
        if (i === chunks.length - 1) u.onend = () => { if (my === token) emit(false); };
        u.onerror = () => { if (my === token) emit(false); };
        synth.speak(u);
      });
      return true;
    },
  };
}
