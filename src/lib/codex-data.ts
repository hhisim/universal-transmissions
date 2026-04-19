import DATA from '../data/codex-raw.json';

export const CODEX_SYSTEMS = [
  "ALCHEMY","ARCHETYPES","CHAKRAS","COLORS","CRYSTALS",
  "DEITIES","ELEMENTS","GEOMETRY","NUMEROLOGY","PLANETS",
  "SOUNDS","TAROT","TREE OF LIFE","YOGA",
];

export const SYS_COLORS: Record<string, string> = {
  ALCHEMY: '#ef4444',
  ARCHETYPES: '#d4a847',
  CHAKRAS: '#a21caf',
  COLORS: '#ec4899',
  CRYSTALS: '#06b6d4',
  DEITIES: '#f59e0b',
  ELEMENTS: '#8b5cf6',
  GEOMETRY: '#14b8a6',
  NUMEROLOGY: '#f97316',
  PLANETS: '#3b82f6',
  SOUNDS: '#84cc16',
  TAROT: '#e040fb',
  'TREE OF LIFE': '#d4a847',
  YOGA: '#a855f7',
};

export interface CodexEntry {
  sys: string;
  e: string;
  al?: string; ar?: string; ch?: string; cl?: string; co?: string; cr?: string;
  d?: string; de?: string; ds?: string; el?: string; fr?: string; g?: string; ge?: string;
  gm?: string; ic?: string; k?: string; ka?: string; l?: string; lh?: string; ll?: string;
  ma?: string; me?: string; mi?: string; my?: string; n?: string; no?: string; nu?: string;
  o?: string; p?: string; ph?: string; pl?: string; pr?: string; ps?: string; pt?: string;
  q?: string; r?: string; s?: string; sy?: string; t?: string; ta?: string;
  tr?: string; vi?: string; vr?: string; wo?: string; xt?: string; yo?: string; zo?: string;
}

export const codex: CodexEntry[] = DATA as CodexEntry[];
