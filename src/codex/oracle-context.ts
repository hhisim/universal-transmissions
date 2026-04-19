import { codex, type CodexEntry } from "@/lib/codex-data";
import { cleanDisplayValue } from "./speech-normalize";
import { selectSignalStack } from "./chamber-text";

const ORACLE_FIELDS: Array<[keyof CodexEntry, string]> = [
  ["al", "Alchemy"],
  ["ar", "Archetype"],
  ["pl", "Planet"],
  ["zo", "Zodiac"],
  ["el", "Element"],
  ["ma", "Major Arcana"],
  ["ge", "Geometry"],
  ["ph", "Physiology"],
  ["ch", "Chakra"],
  ["ka", "Kabbalah"],
  ["nu", "Number"],
  ["fr", "Frequency"],
  ["me", "Metal"],
  ["cr", "Crystal"],
  ["pt", "Plant"],
  ["de", "Deity"],
  ["gm", "Geomancy"],
  ["ic", "I Ching"],
  ["lh", "Hebrew Letter"],
  ["ll", "Latin Letter"],
  ["vi", "Shadow"],
  ["vr", "Virtue"],
];

function tokensFor(value: string) {
  return (value.toLowerCase().match(/[a-z0-9'’.-]+/g) || []).filter((token) => token.length > 2);
}

function entryHaystack(entry: CodexEntry) {
  return [
    entry.sys,
    entry.e,
    ...ORACLE_FIELDS.map(([key]) => cleanDisplayValue(entry[key] as string | undefined)),
  ].join(" ").toLowerCase();
}

export function scoreCodexEntry(entry: CodexEntry, query: string) {
  const tokens = tokensFor(query);
  const haystack = entryHaystack(entry);
  let score = 0;
  for (const token of tokens) {
    if (entry.e.toLowerCase().includes(token)) score += 10;
    if (entry.sys.toLowerCase().includes(token)) score += 5;
    if (haystack.includes(token)) score += 2;
  }
  const stack = selectSignalStack(entry);
  score += Math.min(4, stack.core.length);
  return score;
}

export function findCodexEntries(query: string, limit = 8) {
  const ranked = codex
    .map((entry) => ({ entry, score: scoreCodexEntry(entry, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.length ? ranked : codex.slice(0, limit).map((entry) => ({ entry, score: 0 }));
}

export function formatOracleCodexEntry(entry: CodexEntry) {
  const rows = ORACLE_FIELDS
    .map(([key, label]) => {
      const value = cleanDisplayValue(entry[key] as string | undefined);
      return value ? `${label}: ${value}` : "";
    })
    .filter(Boolean)
    .slice(0, 12);

  return [`System: ${entry.sys}`, `Entry: ${cleanDisplayValue(entry.e)}`, ...rows].join("; ");
}

export function buildOracleCodexContext(question: string) {
  return findCodexEntries(question, 8)
    .map(({ entry }, index) => `${index + 1}. ${formatOracleCodexEntry(entry)}`)
    .join("\n");
}

export function codexRowCount() {
  return codex.length;
}
