// ── Trava de época: impede que coisas de outra época apareçam na história ──
// Detecta a época pela descrição da campanha e diz ao Mestre o que NÃO existe nela.
// Depois de cada resposta, procura objetos e palavras fora de época e manda corrigir.

const norm = (v) => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Épocas reconhecidas. `year` é o teto tecnológico aproximado (o que veio depois não existe). */
export const ERAS = [
  { id: "fantasia-medieval", label: "Fantasia medieval (nível tecnológico medieval)", year: 1300, fantasy: true, re: /westeros|game of thrones|guerra dos tronos|targaryen|stark|lannister|terra[- ]media|tolkien|senhor dos aneis|hobbit|skyrim|tamriel|witcher|bruxo geralt|dungeons|d&d/ },
  { id: "pre-historia", label: "Pré-história", year: -4000, re: /pre-?histor|idade da pedra|paleolit|neolit|homem das cavernas|tribo primitiva|mamute/ },
  { id: "egito", label: "Egito Antigo", year: -500, re: /egito antigo|farao|piramide|nilo|tutancamon|ramses|cleopatra/ },
  { id: "grecia", label: "Grécia Antiga", year: -100, re: /grecia antiga|esparta|atenas|olimpo|termopilas|alexandre o grande|hoplita/ },
  { id: "roma", label: "Roma Antiga", year: 400, re: /roma antiga|imperio romano|legiao|legionari|gladiador|cesar\b|coliseu|senado romano|isekai-roma/ },
  { id: "viking", label: "Era Viking (Escandinávia, séculos VIII–XI)", year: 1050, re: /viking|vikings|nordico|escandinav|ragnar|valhalla|kattegat|jarl|drakkar|runas nordicas|odin|thor\b/ },
  { id: "japao-feudal", label: "Japão feudal (era Sengoku/Edo)", year: 1600, re: /sengoku|samurai|xogum|shogun|ronin|daimyo|oda nobunaga|japao feudal|era edo|isekai-sengoku/ },
  { id: "medieval", label: "Idade Média", year: 1300, re: /medieval|idade media|feudal|cruzad|templari|cavaleiros? da tavola|rei artur|camelot/ },
  { id: "fantasia", label: "Fantasia medieval (nível tecnológico medieval)", year: 1300, fantasy: true, re: /reino de fantasia|fantasia medieval|elfos?\b|anoes\b|dragoes/ },
  { id: "renascimento", label: "Renascimento", year: 1550, re: /renascimento|renascenca|medici|leonardo da vinci|florenca do seculo/ },
  { id: "piratas", label: "Era de ouro da pirataria (Caribe, c. 1650–1730)", year: 1730, re: /pirata|piratas|caribe|corsario|bucaneir|isekai-caribe|tortuga|barba negra/ },
  { id: "revolucao-francesa", label: "Revolução Francesa (c. 1789–1799)", year: 1799, re: /revolucao francesa|robespierre|bastilha|guilhotina|paris[- ]1793|isekai-paris|jacobin/ },
  { id: "velho-oeste", label: "Velho Oeste (c. 1860–1890)", year: 1890, re: /velho oeste|faroeste|cowboy|caubói|xerife|saloon|fronteira americana/ },
  { id: "vitoriana", label: "Era Vitoriana (c. 1837–1901)", year: 1900, re: /vitorian|londres de 18|sherlock|jack o estripador|era vapor/ },
  { id: "ww1", label: "Primeira Guerra Mundial", year: 1918, re: /primeira guerra|1914|trincheiras|grande guerra/ },
  { id: "ww2", label: "Segunda Guerra Mundial", year: 1945, re: /segunda guerra|nazis|nazista|1939|1944|dia d\b|normandia|stalingrado/ },
];

/** O que costuma vazar de épocas futuras: palavra (regex) e o ano aproximado em que passou a existir. */
const ANACHRONISMS = [
  { word: "celular / smartphone", year: 1985, re: /\b(celular|celulares|smartphone|iphone|whatsapp|mensagem de texto)\b/ },
  { word: "internet / computador", year: 1950, re: /\b(internet|computador|notebook|laptop|wi-?fi|e-?mail|site|aplicativo|tablet)\b/ },
  { word: "televisão / rádio", year: 1920, re: /\b(televisao|televisor|tv|radio|radinho|podcast)\b/ },
  { word: "telefone", year: 1876, re: /\b(telefone|telefonema|ligacao telefonica|telegrafo)\b/ },
  { word: "carro / moto / ônibus", year: 1886, re: /\b(carro|carros|automovel|moto|motocicleta|onibus|caminhao|taxi|estacionamento)\b/ },
  { word: "avião / helicóptero", year: 1903, re: /\b(aviao|avioes|helicoptero|aeroporto|drone)\b/ },
  { word: "trem / ferrovia", year: 1825, re: /\b(trem|trens|ferrovia|locomotiva|estacao de trem)\b/ },
  { word: "eletricidade / lâmpada", year: 1880, re: /\b(eletricidade|eletrico|eletrica|lampada|luz eletrica|tomada eletrica|interruptor|lanterna eletrica)\b/ },
  { word: "fotografia / câmera", year: 1839, re: /\b(fotografia|foto|fotos|camera fotografica|selfie|filmadora)\b/ },
  { word: "plástico", year: 1907, re: /\b(plastico|plasticos|isopor|nylon|poliester)\b/ },
  { word: "zíper / jeans / camiseta", year: 1900, re: /\b(ziper|jeans|camiseta|moletom|tenis de corrida)\b/ },
  { word: "arma de fogo / pólvora", year: 1320, re: /\b(pistola|pistolas|revolver|rifle|espingarda|fuzil|metralhadora|mosquete|arcabuz|polvora|canhao|canhoes|bala de chumbo|tiro de arma)\b/ },
  { word: "relógio de bolso / de pulso", year: 1510, re: /\b(relogio de pulso|relogio de bolso|cronometro)\b/ },
  { word: "minutos e segundos marcados", year: 1650, re: /\b(\d+|dez|quinze|trinta|cinco|vinte) (minutos|segundos) (depois|mais tarde|atras)\b/ },
  { word: "óculos", year: 1290, re: /\b(oculos)\b/ },
  { word: "fósforo / isqueiro", year: 1826, re: /\b(fosforo|fosforos|isqueiro)\b/ },
  { word: "cigarro / tabaco", year: 1560, re: /\b(cigarro|cigarros|tabaco|charuto|cachimbo de tabaco)\b/ },
  { word: "batata / tomate / milho (vindos da América)", year: 1550, re: /\b(batata|batatas|tomate|tomates|milho|pimentao|chocolate|abacaxi|peru assado)\b/ },
  { word: "café", year: 1600, re: /\b(cafe(?! da manha)|cafezinho|cafeteria|xicara de cafe)\b/ },
  { word: "jornal impresso", year: 1605, re: /\b(jornal|jornais|revista|manchete)\b/ },
  { word: "polícia / delegacia", year: 1829, re: /\b(policia|policial|policiais|delegacia|delegado|viatura)\b/ },
  { word: "dólar / euro", year: 1792, re: /\b(dolar|dolares|euro|euros|cartao de credito|banco 24)\b/ },
  { word: "gírias modernas (ok, tipo assim, mano)", year: 1900, re: /\b(ok|okay|tipo assim|mano|vlw|blz|top demais)\b/ },
];

/** Época da campanha (ou null quando é moderna, futurista ou não deu para saber). */
export function detectEra(camp = {}) {
  // Época já decidida e salva na campanha (vale para saves antigos e não muda no meio da história).
  if (camp.era && typeof camp.era === "object" && camp.era.label) return camp.era;
  if (camp.eraChecked && camp.era === null) return null;
  return eraFromText([camp.world, camp.worldBg, camp.storyStartPoint, camp.presetId, camp.charBg].filter(Boolean).join(" "));
}

/**
 * Para campanhas já em andamento: se a descrição não diz a época, procura também na
 * lore, na memória e nas primeiras narrações. Fantasia genérica (dragões, elfos) só
 * conta se vier da descrição, para não travar errado uma história moderna.
 */
export function detectEraDeep(camp = {}) {
  const base = eraFromText([camp.world, camp.worldBg, camp.storyStartPoint, camp.presetId, camp.charBg].filter(Boolean).join(" "));
  if (base) return base;
  const firstNarration = (Array.isArray(camp.msgs) ? camp.msgs : [])
    .filter((m) => m && m.role === "assistant")
    .slice(0, 3)
    .map((m) => (typeof m.content === "string" ? m.content : ""));
  const extra = [camp.charLore, camp.lore, camp.memory, ...firstNarration].filter(Boolean).join(" ").slice(0, 12000);
  const era = eraFromText(extra, { skipGenericFantasy: true });
  return era;
}

/** Versão para salvar na campanha. */
export function eraSnapshot(era) {
  return era ? { id: era.id, label: era.label, year: era.year, fantasy: Boolean(era.fantasy), isekai: Boolean(era.isekai) } : null;
}

function eraFromText(raw, { skipGenericFantasy = false } = {}) {
  const text = norm(raw);
  if (!text) return null;
  const futurist = /(cyberpunk|futurist|espacial|nave estelar|pos-apocalip|apocalipse zumbi|\b20[3-9]\d\b|\b2[1-9]\d\d\b)/.test(text);
  const isekaiText = /isekai|acorda (em|no|na)|homem moderno|do seculo xxi|viajou no tempo|transportado|reencarn/.test(text);
  if (futurist && !isekaiText) return null;
  const year = explicitYear(text);
  const match = ERAS.find((e) => (!skipGenericFantasy || e.id !== "fantasia") && e.re.test(text));
  if (!match && (year == null || year >= 1990)) return null;
  const era = match ? { ...match } : { id: "ano", label: `Ano ${year}`, year };
  if (year != null && year < 1990 && !match?.fantasy) era.year = Math.min(era.year, year + 10);
  era.isekai = isekaiText;
  delete era.re;
  return era;
}

function explicitYear(text) {
  const ad = text.match(/\b(?:ano (?:de )?)?(\d{3,4})\s*(?:d\.?\s?c\.?|ad)\b/) || text.match(/\bano (?:de )?(\d{3,4})\b/) || text.match(/\bem (1[0-8]\d\d|[5-9]\d\d)\b/);
  if (ad) return Number(ad[1]);
  const bc = text.match(/\b(\d{2,4})\s*a\.?\s?c\.?\b/);
  if (bc) return -Number(bc[1]);
  const sec = text.match(/\bseculo ([ivxl]+)\b/);
  if (sec) {
    const n = romanToInt(sec[1]);
    if (n > 0 && n < 21) return n * 100 - 50;
  }
  return null;
}

function romanToInt(r) {
  const map = { i: 1, v: 5, x: 10, l: 50 };
  let total = 0;
  for (let i = 0; i < r.length; i += 1) {
    const cur = map[r[i]] || 0;
    const next = map[r[i + 1]] || 0;
    total += cur < next ? -cur : cur;
  }
  return total;
}

/** O que ainda não existe nesta época. */
export function forbiddenFor(era) {
  if (!era) return [];
  return ANACHRONISMS.filter((a) => a.year > era.year);
}

/** Bloco de prompt que trava a época. */
export function eraPromptLines(camp = {}, { short = false } = {}) {
  const era = detectEra(camp);
  if (!era) return [];
  const banned = forbiddenFor(era).map((a) => a.word);
  const isekai = era.isekai
    ? " O personagem do jogador veio de outra época: ele pode LEMBRAR ou FALAR de coisas modernas, mas o mundo não tem, não fabrica e não entende nada disso — quem ouve estranha. Nada moderno aparece na cena, nas mãos de NPCs ou na paisagem."
    : "";
  if (short) return [`ÉPOCA TRAVADA: ${era.label}. Nada que ainda não exista nesta época${banned.length ? ` (${banned.slice(0, 8).join(", ")})` : ""}.${isekai}`];
  return [
    `ÉPOCA TRAVADA — ${era.label}${era.fantasy ? "" : ` (tecnologia até c. ${era.year < 0 ? `${-era.year} a.C.` : `${era.year} d.C.`})`}. Isso vale para a campanha INTEIRA, não só para a abertura.`,
    `Tudo na cena pertence a esta época: objetos, armas, comida, roupas, moedas, profissões, instituições, medidas de tempo e distância, e o jeito de falar dos NPCs (sem gíria moderna).${banned.length ? ` NÃO EXISTEM AQUI: ${banned.join("; ")}.` : ""}`,
    `Se o jogador pedir ou citar algo que não existe, o mundo reage com estranheza e oferece o equivalente da época (mensageiro em vez de telefone, tocha em vez de lanterna).${isekai}`,
  ];
}

/** Lembrete curto para o fim do prompt (a parte que o modelo lê por último). */
export function eraReminder(camp = {}) {
  const era = detectEra(camp);
  return era ? `ÚLTIMA CHECAGEM: a história está em ${era.label}. Releia a resposta antes de mandar e troque qualquer coisa que não exista nesta época.` : "";
}

/** Anacronismos encontrados numa resposta do Mestre. */
export function findAnachronisms(text, camp = {}) {
  const era = detectEra(camp);
  if (!era) return [];
  const clean = norm(String(text || "").replace(/\[[^\]]*\]/g, " ").replace(/IMAGE_PROMPT:.*$/s, " "));
  // Falas e lembranças do próprio jogador (isekai) não contam: tira trechos depois de "você lembra/pensa".
  const scan = era.isekai ? clean.replace(/(voce (lembra|recorda|pensa|se lembra)|na sua (epoca|vida antiga|memoria)|no seu tempo)[^.!?]*[.!?]/g, " ") : clean;
  return forbiddenFor(era).filter((a) => a.re.test(scan)).map((a) => a.word);
}

/** Nota interna para a próxima resposta corrigir o deslize. */
export function anachronismNote(words = [], camp = {}) {
  const era = detectEra(camp);
  if (!era || !words.length) return "";
  return `CORREÇÃO DE ÉPOCA: a resposta anterior mencionou ${words.join(", ")} — isso não existe em ${era.label}. Não repita. Se esse elemento ficou na cena, trate-o como o equivalente da época (sem explicar nem pedir desculpa) e siga a história.`;
}
