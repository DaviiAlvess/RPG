import { DEFAULT_APP } from "../lib/appearance.mjs";

const SKIN = { "Muito clara": "#f6dcc8", "Clara": "#eac3a2", "Morena clara": "#c99572", "Morena": "#9c6a45", "Negra": "#5e3b25" };
const HAIR = { "Preto": "#17120f", "Castanho": "#5c3317", "Loiro": "#d6b25e", "Ruivo": "#a3401c", "Branco/Grisalho": "#c9c9c9" };
const EYES = { "Castanhos": "#5c3317", "Verdes": "#2d7a55", "Azuis": "#2c6aa8", "Cinzas": "#7a8796", "Pretos": "#121218" };
const FACE = { "Oval": [27, 34], "Quadrada": [30, 31], "Redonda": [31, 31], "Triangular": [28, 33], "Alongada": [25, 37] };
const BODY = { "Magro": 34, "Atlético": 44, "Médio": 40, "Robusto": 50, "Gordo": 54 };
const SCALE = { "Muito baixo": 0.86, "Baixo": 0.93, "Médio": 1, "Alto": 1.04, "Muito alto": 1.08 };

function Hair({ a, color, ry }) {
  const top = 60 - ry;
  if (a.hairLen === "Careca") return null;
  if (a.hairStyle === "Raspado/Moicano") {
    return <path d={`M60 ${top - 10} q-7 8 -6 ${ry * 0.9} h12 q1 ${-ry * 0.9} -6 ${-ry * 0.9 - 8}z`} fill={color} className="av2-hair" />;
  }
  const len = { "Curto": 0, "Médio": 18, "Longo": 40, "Muito longo": 60 }[a.hairLen] ?? 10;
  const curly = a.hairStyle === "Cacheado" || a.hairStyle === "Crespo";
  const wavy = a.hairStyle === "Ondulado";
  const w = wavy ? 4 : 0;
  const back = len ? <path d={`M29 56 Q${22 - w} ${74 + len * 0.6} ${24 - w} ${84 + len} Q40 ${90 + len} 46 ${80 + len * 0.5} L74 ${80 + len * 0.5} Q80 ${90 + len} ${96 + w} ${84 + len} Q${98 + w} ${74 + len * 0.6} 91 56 Z`} fill={color} className="av2-hair" /> : null;
  const cap = curly
    ? <g fill={color} className="av2-hair">{[...Array(9)].map((_, i) => { const ang = Math.PI + (i / 8) * Math.PI; return <circle key={i} cx={60 + Math.cos(ang) * 31} cy={58 + Math.sin(ang) * (ry + 2)} r={a.hairStyle === "Crespo" ? 11 : 9} />; })}</g>
    : <path d={`M28 ${60} Q26 ${top - 6} 60 ${top - 8} Q94 ${top - 6} 92 ${60} Q86 ${top + 10} 60 ${top + 6} Q38 ${top + 10} 28 60 Z`} fill={color} className="av2-hair" />;
  return <>{back}{cap}</>;
}

/** Personagem animado que reflete as escolhas de aparência em tempo real. */
export default function TraitAvatar({ appearance, size = 168 }) {
  const a = { ...DEFAULT_APP, ...(appearance || {}) };
  const skin = SKIN[a.skin] || SKIN["Morena clara"];
  const hair = HAIR[a.hairColor] || HAIR.Castanho;
  const eye = EYES[a.eyeColor] || EYES.Castanhos;
  const [rx, ry] = FACE[a.face] || FACE.Oval;
  const shoulders = BODY[a.body] || 40;
  const scale = SCALE[a.height] || 1;
  const eyeR = { "Grandes": 4.6, "Pequenos": 2.6, "Puxados": 3.2, "Redondos": 4, "Amendoados": 3.6 }[a.eyeShape] || 3.6;
  const eyeRy = a.eyeShape === "Puxados" ? eyeR * 0.55 : a.eyeShape === "Amendoados" ? eyeR * 0.75 : eyeR;
  const fem = a.presentation === "Feminina";

  return (
    <svg className="av2" width={size} height={size} viewBox="0 0 120 140" role="img" aria-label="Prévia da aparência">
      <defs>
        <radialGradient id="av2bg" cx="0.5" cy="0.4" r="0.7"><stop offset="0" stopColor="#3a3326" /><stop offset="1" stopColor="#14181c" /></radialGradient>
      </defs>
      <rect width="120" height="140" rx="14" fill="url(#av2bg)" />
      <g className="av2-figure" style={{ transform: `scale(${scale})`, transformOrigin: "60px 140px" }}>
        <g className="av2-breathe">
          <path d={`M${60 - shoulders} 140 Q${60 - shoulders} ${104 - (fem ? 2 : 0)} 60 100 Q${60 + shoulders} ${104 - (fem ? 2 : 0)} ${60 + shoulders} 140 Z`} fill="#4d4130" className="av2-body" />
          <rect x="52" y="86" width="16" height="18" rx="6" fill={skin} className="av2-skin" />
          {a.extras === "Tatuagem" ? <path d="M54 96 l4 -4 l4 4 l4 -4" stroke="#1f3b5a" strokeWidth="2" fill="none" /> : null}
          <Hair a={a} color={hair} ry={ry} />
          <ellipse cx="60" cy="60" rx={rx} ry={ry} fill={skin} className="av2-skin" />
          <ellipse cx={60 - rx + 1} cy="62" rx="3" ry="5" fill={skin} className="av2-skin" />
          <ellipse cx={60 + rx - 1} cy="62" rx="3" ry="5" fill={skin} className="av2-skin" />
          {a.hairLen !== "Careca" && a.hairStyle !== "Raspado/Moicano" && a.hairStyle !== "Cacheado" && a.hairStyle !== "Crespo"
            ? <path d={`M${60 - rx} 54 Q60 ${60 - ry - 4} ${60 + rx} 54 Q${60 + rx - 4} ${60 - ry + 4} 60 ${60 - ry + 2} Q${60 - rx + 4} ${60 - ry + 4} ${60 - rx} 54Z`} fill={hair} className="av2-hair" />
            : null}
          <g className="av2-eyes">
            <ellipse cx="49" cy="60" rx={eyeR + 1.6} ry={eyeRy + 1.2} fill="#f4f1ea" />
            <ellipse cx="71" cy="60" rx={eyeR + 1.6} ry={eyeRy + 1.2} fill="#f4f1ea" />
            <circle cx="49" cy="60" r={Math.min(eyeR, eyeRy + 0.6)} fill={eye} className="av2-iris" />
            <circle cx="71" cy="60" r={Math.min(eyeR, eyeRy + 0.6)} fill={eye} className="av2-iris" />
            <circle cx="50" cy="59" r="0.9" fill="#fff" /><circle cx="72" cy="59" r="0.9" fill="#fff" />
          </g>
          <path d={`M44 ${53 - (a.eyeShape === "Grandes" ? 1 : 0)} q5 -3 10 0 M66 53 q5 -3 10 0`} stroke={hair} strokeWidth="2" fill="none" strokeLinecap="round" className="av2-hair-stroke" />
          <path d="M60 62 q-2 6 1 8" stroke="rgba(0,0,0,.25)" strokeWidth="1.5" fill="none" />
          <path d={`M53 ${74 + (ry - 34) / 3} q7 4 14 0`} stroke="#7a3b2e" strokeWidth="2" fill="none" strokeLinecap="round" />
          {a.extras === "Barba" ? <path d={`M${60 - rx + 3} 64 Q${60 - rx + 4} ${60 + ry + 6} 60 ${60 + ry + 8} Q${60 + rx - 4} ${60 + ry + 6} ${60 + rx - 3} 64 Q60 ${82} ${60 - rx + 3} 64Z`} fill={hair} opacity=".92" className="av2-hair" /> : null}
          {a.extras === "Cicatriz" ? <path d="M70 50 l6 16" stroke="#c46a5a" strokeWidth="2" strokeLinecap="round" /> : null}
          {a.extras === "Sardas" ? <g fill="#a0603a" opacity=".7">{[[46, 67], [50, 69], [43, 70], [74, 67], [70, 69], [77, 70]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="0.9" />)}</g> : null}
        </g>
      </g>
    </svg>
  );
}
