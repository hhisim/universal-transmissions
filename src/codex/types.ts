import type { CodexEntry } from "@/lib/codex-data";

export type TabId = "home" | "matrix" | "symbols" | "letters" | "decode" | "oracle";
export type ChamberId = "synthesis" | "resonance" | "stream";

export type SynthesisMode =
  | "oracle"
  | "mythic"
  | "alchemical"
  | "clinical_symbolic"
  | "xenolinguistic";

export type ResonanceMode = "harmony" | "tension" | "mirror" | "transformation";

export type StreamMode =
  | "dream_logic"
  | "chakra_ascent"
  | "planetary_descent"
  | "elemental_transformation";

export type CodexObjectType = "entry" | "symbol" | "letter" | "word" | "oracle" | "stream";

export interface CodexObject {
  id: string;
  type: CodexObjectType;
  name: string;
  system?: string;
  summary?: string;
  entry?: CodexEntry;
  letter?: string;
  value?: string;
}

export interface ChamberTextBundle {
  title: string;
  subtitle?: string;
  displayText: string;
  guideText: string;
  narrationText: string;
  quotaLine: string;
}

export interface ResonanceBundle extends ChamberTextBundle {
  sharedFields: Array<{ key: string; values: string[] }>;
  frictions: Array<{ key: string; values: string[] }>;
  hiddenBridges: Array<{ key: string; values: string[] }>;
}

export interface StreamNodeBundle extends ChamberTextBundle {
  nodeId: string;
  nodeName: string;
  transitionReason: string;
  entry?: CodexEntry;
}

export interface StreamBundle {
  streamTitle: string;
  streamSubtitle: string;
  displayIntro: string;
  guideIntro: string;
  narrationIntro: string;
  nodes: StreamNodeBundle[];
  closingLine: string;
  quotaLine: string;
}

export interface UsageSnapshot {
  used: number;
  limit: number | "unlimited";
  remaining: number | "unlimited";
  tier: "guest" | "free" | "initiate";
}
