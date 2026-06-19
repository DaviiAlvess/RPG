/**
 * Sistema narrativo de passagem de tempo — calendário interno, parsing e efeitos temporais.
 */

export const TIME_OF_DAY_ORDER = ["manhã", "tarde", "noite", "madrugada"];

export const DAYS_PER_MONTH = 30;
export const MONTHS_PER_YEAR = 12;
export const DAYS_PER_YEAR = 365;

export const DEFAULT_GAME_TIME = {
  day: 0,
  month: 0,
  year: 0,
  season: "inverno",
  timeOfDay: "manhã",
  totalDaysElapsed: 0,
};

export const TIME_SKIP_PRESETS = [
  { id: "hours", label: "Algumas horas", unit: "horas", quantity: 4 },
  { id: "next_day", label: "Até o dia seguinte", unit: "dias", quantity: 1 },
  { id: "days", label: "Alguns dias", unit: "dias", quantity: 3, customAmount: true },
  { id: "weeks", label: "Algumas semanas", unit: "semanas", quantity: 2 },
  { id: "months", label: "Alguns meses", unit: "meses", quantity: 1, customAmount: true },
  { id: "year", label: "Um ou mais anos", unit: "anos", quantity: 1, customAmount: true },
];

const UNIT_ALIASES = {
  minuto: "minutos",
  minutos: "minutos",
  hora: "horas",
  horas: "horas",
  dia: "dias",
  dias: "dias",
  semana: "semanas",
  semanas: "semanas",
  mes: "meses",
  mês: "meses",
  meses: "meses",
  ano: "anos",
  anos: "anos",
};

const UNIT_TO_DAYS = {
  minutos: 0,
  horas: 0,
  dias: 1,
  semanas: 7,
  meses: 30,
  anos: 365,
};

export function normalizeUnit(raw) {
  if (!raw) return "dias";
  const key = String(raw).toLowerCase().trim();
  return UNIT_ALIASES[key] || key;
}

export function getSeasonFromMonth(month) {
  const m = Number(month);
  if (Number.isNaN(m)) return "inverno";
  if (m >= 2 && m <= 4) return "primavera";
  if (m >= 5 && m <= 7) return "verão";
  if (m >= 8 && m <= 10) return "outono";
  return "inverno";
}

export function createDefaultGameTime() {
  return { ...DEFAULT_GAME_TIME };
}

export function normalizeGameTime(gt) {
  if (!gt || typeof gt !== "object") return createDefaultGameTime();
  let day = Math.max(0, Number(gt.day));
  if (Number.isNaN(day)) day = 0;
  let month = Math.max(0, Math.min(MONTHS_PER_YEAR - 1, Number(gt.month)));
  if (Number.isNaN(month)) month = 0;
  let year = Math.max(0, Number(gt.year));
  if (Number.isNaN(year)) year = 0;
  const timeOfDay = TIME_OF_DAY_ORDER.includes(gt.timeOfDay) ? gt.timeOfDay : "manhã";
  const totalDaysElapsed = Math.max(0, Number(gt.totalDaysElapsed) || 0);
  // Migra saves antigos que começavam em 1/1/1 sem tempo decorrido
  if (totalDaysElapsed === 0 && day === 1 && month === 1 && year === 1) {
    day = 0;
    month = 0;
    year = 0;
  }
  return {
    day,
    month,
    year,
    season: getSeasonFromMonth(month),
    timeOfDay,
    totalDaysElapsed,
  };
}

function advanceCalendar(day, month, year, daysToAdd) {
  let d = day;
  let m = month;
  let y = year;
  let remaining = daysToAdd;

  while (remaining > 0) {
    d += 1;
    if (d >= DAYS_PER_MONTH) {
      d = 0;
      m += 1;
      if (m >= MONTHS_PER_YEAR) {
        m = 0;
        y += 1;
      }
    }
    remaining -= 1;
  }

  return { day: d, month: m, year: y };
}

function shiftTimeOfDay(current, steps) {
  let timeOfDay = current;
  let daysCrossed = 0;
  let idx = TIME_OF_DAY_ORDER.indexOf(timeOfDay);
  if (idx < 0) idx = 0;

  for (let i = 0; i < steps; i += 1) {
    idx += 1;
    if (idx >= TIME_OF_DAY_ORDER.length) {
      idx = 0;
      daysCrossed += 1;
    }
  }

  return { timeOfDay: TIME_OF_DAY_ORDER[idx], daysCrossed };
}

/**
 * Função central de avanço temporal.
 * @returns {{ gameTime: object, daysAdvanced: number }}
 */
export function applyTimeSkip(gameTime, unit, quantity, options = {}) {
  const gt = normalizeGameTime(gameTime);
  const unidade = normalizeUnit(unit);
  const qty = Math.max(0, Number(quantity) || 0);

  if (qty === 0) {
    return { gameTime: gt, daysAdvanced: 0 };
  }

  let { day, month, year, timeOfDay, totalDaysElapsed } = gt;
  let daysAdvanced = 0;

  if (unidade === "minutos") {
    return { gameTime: gt, daysAdvanced: 0 };
  }

  if (unidade === "horas") {
    const steps = qty >= 6 ? Math.max(1, Math.round(qty / 6)) : (qty >= 3 ? 1 : 0);
    if (steps > 0) {
      const shifted = shiftTimeOfDay(timeOfDay, steps);
      timeOfDay = options.timeOfDay || shifted.timeOfDay;
      if (shifted.daysCrossed > 0) {
        const cal = advanceCalendar(day, month, year, shifted.daysCrossed);
        day = cal.day;
        month = cal.month;
        year = cal.year;
        daysAdvanced += shifted.daysCrossed;
        totalDaysElapsed += shifted.daysCrossed;
      }
    } else if (options.timeOfDay) {
      timeOfDay = options.timeOfDay;
    }
  } else {
    const calendarDays = qty * (UNIT_TO_DAYS[unidade] ?? 1);
    daysAdvanced = calendarDays;
    totalDaysElapsed += calendarDays;
    const cal = advanceCalendar(day, month, year, calendarDays);
    day = cal.day;
    month = cal.month;
    year = cal.year;
    timeOfDay = options.timeOfDay || (calendarDays >= 1 ? "manhã" : timeOfDay);
  }

  if (options.timeOfDay && unidade !== "horas") {
    timeOfDay = options.timeOfDay;
  }

  return {
    gameTime: {
      day,
      month,
      year,
      season: getSeasonFromMonth(month),
      timeOfDay,
      totalDaysElapsed,
    },
    daysAdvanced,
  };
}

const PARSE_PATTERNS = [
  {
    regex: /\[TIME_SKIP:\s*unidade\s*=\s*(\w+)\s*,\s*quantidade\s*=\s*(\d+(?:[.,]\d+)?)\s*\]/i,
    map: (m) => ({ unidade: normalizeUnit(m[1]), quantidade: parseFloat(String(m[2]).replace(",", ".")) }),
  },
  {
    regex: /\[TIME_SKIP:\s*(\w+)\s*,\s*(\d+(?:[.,]\d+)?)\s*\]/i,
    map: (m) => ({ unidade: normalizeUnit(m[1]), quantidade: parseFloat(String(m[2]).replace(",", ".")) }),
  },
  { regex: /(\d+)\s*anos?\s*(?:depois|se\s*passaram|mais\s*tarde|transcorridos?)/i, map: (m) => ({ unidade: "anos", quantidade: parseInt(m[1], 10) }) },
  { regex: /\bum\s*ano\s*(?:depois|se\s*passou|mais\s*tarde|transcorrido)/i, map: () => ({ unidade: "anos", quantidade: 1 }) },
  { regex: /(\d+)\s*meses?\s*(?:depois|se\s*passaram|mais\s*tarde|transcorridos?)/i, map: (m) => ({ unidade: "meses", quantidade: parseInt(m[1], 10) }) },
  { regex: /\b(?:alguns?|vários?)\s*meses?\s*(?:depois|se\s*passaram|mais\s*tarde|transcorridos?)/i, map: () => ({ unidade: "meses", quantidade: 3 }) },
  { regex: /(\d+)\s*semanas?\s*(?:depois|se\s*passaram|mais\s*tarde|transcorridas?)/i, map: (m) => ({ unidade: "semanas", quantidade: parseInt(m[1], 10) }) },
  { regex: /\buma\s*semana\s*(?:depois|se\s*passou|mais\s*tarde|transcorrida)/i, map: () => ({ unidade: "semanas", quantidade: 1 }) },
  { regex: /(\d+)\s*dias?\s*(?:depois|se\s*passaram|mais\s*tarde|transcorridos?)/i, map: (m) => ({ unidade: "dias", quantidade: parseInt(m[1], 10) }) },
  { regex: /no\s*dia\s*seguinte|na\s*manhã\s*seguinte|na\s*manha\s*seguinte/i, map: () => ({ unidade: "dias", quantidade: 1, timeOfDay: "manhã" }) },
  { regex: /(\d+)\s*horas?\s*(?:depois|se\s*passaram|mais\s*tarde|transcorridas?)/i, map: (m) => ({ unidade: "horas", quantidade: parseInt(m[1], 10) }) },
  { regex: /\balgumas?\s*horas?\s*(?:depois|se\s*passaram|mais\s*tarde|transcorridas?)/i, map: () => ({ unidade: "horas", quantidade: 4 }) },
  { regex: /ao\s*amanhecer/i, map: () => ({ unidade: "horas", quantidade: 8, timeOfDay: "manhã" }) },
  { regex: /ao\s*anoitecer|ao\s*entardecer/i, map: () => ({ unidade: "horas", quantidade: 4, timeOfDay: "noite" }) },
  { regex: /à\s*meia[- ]noite|a\s*meia[- ]noite/i, map: () => ({ unidade: "horas", quantidade: 6, timeOfDay: "madrugada" }) },
];

/**
 * Analisa texto narrativo em busca de marcadores de tempo (conservador).
 * Prioriza tags estruturadas [TIME_SKIP:...].
 */
export function parseTimeSkip(text) {
  if (!text || typeof text !== "string") return null;

  for (const pattern of PARSE_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match) {
      const parsed = pattern.map(match);
      if (parsed?.quantidade > 0) return parsed;
    }
  }

  return null;
}

export function stripTimeSkipTags(text) {
  if (!text) return "";
  return text
    .replace(/\[TIME_SKIP:[^\]]+\]/gi, "")
    .replace(/\[TIMESKIP:[^\]]+\]/gi, "")
    .trim();
}

export function calculateAge(initialAge, totalDaysElapsed) {
  const base = parseInt(initialAge, 10) || 0;
  const yearsPassed = Math.floor((Number(totalDaysElapsed) || 0) / DAYS_PER_YEAR);
  return base + yearsPassed;
}

export function resolveTemporalEffects(effects, totalDaysElapsed) {
  if (!Array.isArray(effects)) return { active: [], expired: [] };
  const active = [];
  const expired = [];
  const now = Number(totalDaysElapsed) || 0;

  for (const effect of effects) {
    if (effect?.expiraEm != null && now >= Number(effect.expiraEm)) {
      expired.push(effect);
    } else {
      active.push(effect);
    }
  }

  return { active, expired };
}

export function formatGameTimeShort(gt) {
  const t = normalizeGameTime(gt);
  const seasonLabel = t.season.charAt(0).toUpperCase() + t.season.slice(1);
  const todLabel = t.timeOfDay.charAt(0).toUpperCase() + t.timeOfDay.slice(1);
  return `Dia ${t.day} — ${seasonLabel} — ${todLabel}`;
}

export function formatGameTimeLong(gt) {
  const t = normalizeGameTime(gt);
  const seasonLabel = t.season.charAt(0).toUpperCase() + t.season.slice(1);
  const todLabel = t.timeOfDay.charAt(0).toUpperCase() + t.timeOfDay.slice(1);
  return `Dia ${t.day}, Mês ${t.month}, Ano ${t.year} · ${seasonLabel} · ${todLabel}`;
}

export function formatTimeSkipContext(unit, quantity) {
  const unidade = normalizeUnit(unit);
  const qty = Number(quantity) || 0;
  const labels = {
    minutos: qty === 1 ? "1 minuto se passou" : `${qty} minutos se passaram`,
    horas: qty === 1 ? "1 hora se passou" : `${qty} horas se passaram`,
    dias: qty === 1 ? "1 dia se passou" : `${qty} dias se passaram`,
    semanas: qty === 1 ? "1 semana se passou" : `${qty} semanas se passaram`,
    meses: qty === 1 ? "1 mês se passou" : `${qty} meses se passaram`,
    anos: qty === 1 ? "1 ano se passou" : `${qty} anos se passaram`,
  };
  return labels[unidade] || `${qty} ${unidade} se passaram`;
}

export function formatTimeSkipSeparator(daysAdvanced, unit, quantity) {
  if (daysAdvanced > 1) {
    return `${daysAdvanced} dias se passaram`;
  }
  const unidade = normalizeUnit(unit);
  const qty = Number(quantity) || 0;
  if (unidade === "dias" && qty > 1) return `${qty} dias se passaram`;
  if (unidade === "semanas") return formatTimeSkipContext(unit, quantity);
  if (unidade === "meses") return formatTimeSkipContext(unit, quantity);
  if (unidade === "anos") return formatTimeSkipContext(unit, quantity);
  return formatTimeSkipContext(unit, quantity);
}

export function shouldShowTimeSeparator(daysAdvanced, unit, quantity) {
  if (daysAdvanced > 1) return true;
  const unidade = normalizeUnit(unit);
  return ["semanas", "meses", "anos"].includes(unidade) && (Number(quantity) || 0) >= 1;
}

export function getSeasonIcon(season) {
  const map = {
    primavera: "ti-flower",
    verão: "ti-sun",
    outono: "ti-leaf",
    inverno: "ti-snowflake",
  };
  return map[season] || "ti-sun";
}

export function getTimeOfDayIcon(timeOfDay) {
  const map = {
    manhã: "ti-sunrise",
    tarde: "ti-sun",
    noite: "ti-moon",
    madrugada: "ti-moon-stars",
  };
  return map[timeOfDay] || "ti-sun";
}

export function createAdventureStartEvent() {
  return {
    id: `evt-${Date.now()}`,
    label: "Início da aventura",
    totalDaysElapsed: 0,
  };
}
