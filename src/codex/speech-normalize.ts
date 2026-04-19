const CHAKRA_NAMES: Record<string, string> = {
  "ROOT-MULADHARA": "the root chakra",
  "SACRAL-SVADHISTHANA": "the sacral chakra",
  "SOLAR-PLEXUS-MANIPURA": "the solar plexus",
  "HEART-ANAHATA": "the heart chakra",
  "THROAT-VISHUDDHA": "the throat chakra",
  "AJNA-THIRD-EYE": "the third eye",
  "CROWN-SAHASRARA": "the crown chakra",
};

const SYMBOL_WORDS: Array<[RegExp, string]> = [
  [/[♀]/g, "Venus"],
  [/[♂]/g, "Mars"],
  [/[☿]/g, "Mercury"],
  [/[♃]/g, "Jupiter"],
  [/[♄]/g, "Saturn"],
  [/[♅]/g, "Uranus"],
  [/[♆]/g, "Neptune"],
  [/[♇]/g, "Pluto"],
  [/[☉]/g, "Sun"],
  [/[☽]/g, "Moon"],
  [/[♈]/g, "Aries"],
  [/[♉]/g, "Taurus"],
  [/[♊]/g, "Gemini"],
  [/[♋]/g, "Cancer"],
  [/[♌]/g, "Leo"],
  [/[♍]/g, "Virgo"],
  [/[♎]/g, "Libra"],
  [/[♏]/g, "Scorpio"],
  [/[♐]/g, "Sagittarius"],
  [/[♑]/g, "Capricorn"],
  [/[♒]/g, "Aquarius"],
  [/[♓]/g, "Pisces"],
];

export function cleanDisplayValue(value?: string | null): string {
  if (!value) return "";
  let next = String(value);
  SYMBOL_WORDS.forEach(([pattern, replacement]) => {
    next = next.replace(pattern, replacement);
  });
  next = next
    .replace(/â[^\s;,)]+/g, "")
    .replace(/Ã¯/g, "i")
    .replace(/Ã©/g, "e")
    .replace(/â€“|â€”/g, " - ")
    .replace(/â€™/g, "'")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+;/g, ";")
    .trim();
  return next;
}

export function normalizeForSpeech(value: string): string {
  let next = cleanDisplayValue(value);
  Object.entries(CHAKRA_NAMES).forEach(([raw, spoken]) => {
    next = next.replace(new RegExp(raw, "g"), spoken);
  });
  return next
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\b[IVXLCDM]+\s*[-–—]\s*/g, "")
    .replace(/\b(\d{1,2})\s*[-–—]\s*/g, "")
    .replace(/[_{}[\]<>#*_`|~]/g, " ")
    .replace(/[;:]+/g, ". ")
    .replace(/\s{2,}/g, " ")
    .replace(/\.\s+\./g, ".")
    .trim();
}

export function splitSignals(value?: string | null, limit = 3): string[] {
  return cleanDisplayValue(value)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, limit);
}

export function formatSignal(value?: string | null, fallback = "unwritten"): string {
  return splitSignals(value, 1)[0] ?? fallback;
}
