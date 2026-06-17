export const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
export const attrMod = (val) => { const m = Math.floor((val - 10) / 2); return m >= 0 ? `+${m}` : `${m}`; };
export const relationClass = (a) => { const l = (a || "").toLowerCase(); if (l.includes("hostil")) return "hostil"; if (l.includes("amig") || l.includes("aliad")) return "amigavel"; if (l.includes("suspe")) return "suspeito"; return "neutral"; };
export const hpColor = (pct) => (pct < 30 ? "var(--red)" : pct < 60 ? "var(--amber)" : "var(--green)");
