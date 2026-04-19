"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { codex, type CodexEntry } from "@/lib/codex-data";
import { ontology } from "@/lib/ontology-data";
import { buildSynthesis, findEntanglements, selectSignalStack } from "@/codex/chamber-text";
import { cleanDisplayValue } from "@/codex/speech-normalize";
import type { SynthesisMode } from "@/codex/types";
import { CK, CODEX_SYSTEMS, FORORDER, SYS_COLORS, getSysColor } from "@/lib/correspondence-systems";

type Surface = "matrix" | "symbols" | "letters" | "decode" | "chakra" | "clusters";
type ActionMode = "ENTANGLE" | "DECODE" | "ORACLE";
type DecodeMode = "SUPER_MATRIX" | "ALPHABET_ONTOLOGY";
type EntryField = keyof CodexEntry;

type Props = {
  color: string;
  mode: string;
  rows: number;
  status: string;
  lastOracleText?: string;
  onSeedOracle(prompt: string): void;
  onAskOracle(prompt: string): void;
  onSetMode(mode: string): void;
  children?: ReactNode;
};

const FIELD_LABELS: Record<string, string> = {
  al: "Alchemy", ar: "Archetypes", co: "Colors", cr: "Crystals",
  de: "Deities", el: "Elements", fr: "Frequency", gm: "Geomancy",
  ge: "Geometry", ic: "I Ching", ka: "Kabbalah", lh: "Hebrew",
  ll: "Latin", ma: "Major Arcana", my: "Mayan", me: "Metals",
  mi: "Minor Arcana", no: "Note", nu: "Number", ph: "Physiology",
  pl: "Planets", pt: "Plants", ps: "Platonic Solid", vi: "Shadow/Vices",
  vr: "Virtues", zo: "Zodiac", ch: "Chakras",
};
const DISPLAY_FIELDS = FORORDER.filter((key) => key !== "sys" && key !== "e") as EntryField[];
const FIELD_SYSTEMS: Record<string, string> = {
  al: "ALCHEMY", ar: "ARCHETYPES", co: "COLORS", cr: "CRYSTALS", de: "DEITIES",
  el: "ELEMENTS", fr: "FREQUENCY", gm: "GEOMANCY", ge: "GEOMETRY", ic: "I_CHING",
  ka: "KABBALAH", lh: "LETTERS_HEBREW", ll: "LETTERS_LATIN", ma: "MAJOR_ARCANA",
  my: "MAYAN", me: "METALS", mi: "MINOR_ARCANA", no: "FREQUENCY", nu: "NUMBERS",
  ph: "PHYSIOLOGY", pl: "PLANETS", pt: "PLANTS", ps: "PLATONIC_SOLIDS",
  vi: "VICES", vr: "VIRTUES", zo: "ZODIAC", ch: "CHAKRAS",
};
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const COLOR_WORDS: Record<string, string> = {
  red: "#ef4444", crimson: "#dc2626", orange: "#f97316", yellow: "#eab308",
  gold: "#d4a847", green: "#22c55e", emerald: "#10b981", blue: "#3b82f6",
  violet: "#a855f7", purple: "#9333ea", pink: "#ec4899", silver: "#cbd5e1",
  white: "#f8fafc", black: "#64748b", grey: "#94a3b8", copper: "#f97316",
};

function entryName(entry: CodexEntry) {
  return cleanDisplayValue(entry.e);
}

function entryColor(entry: CodexEntry) {
  return getSysColor(entry.sys);
}

function fieldValue(entry: CodexEntry, key: EntryField) {
  return cleanDisplayValue(String(entry[key] || ""));
}

function splitTokens(value: string) {
  return cleanDisplayValue(value).split(";").map((item) => item.trim()).filter(Boolean);
}

function normalizeLookup(value: string) {
  return cleanDisplayValue(value)
    .replace(/\[[^\]]+\]/g, "")
    .replace(/^[ivxlcdm0-9]+\s*[--]\s*/i, "")
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\bthe\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findEntryForToken(token: string, field?: EntryField) {
  const system = field ? FIELD_SYSTEMS[String(field)] : "";
  const normalized = normalizeLookup(token);
  if (!normalized) return undefined;
  return (
    codex.find((entry) => entry.sys === system && normalizeLookup(entry.e) === normalized) ||
    codex.find((entry) => normalizeLookup(entry.e) === normalized) ||
    codex.find((entry) => entry.sys === system && normalizeLookup(entry.e).includes(normalized)) ||
    codex.find((entry) => normalizeLookup(entry.e).includes(normalized))
  );
}

function fieldChipColor(field: EntryField, token: string) {
  const raw = cleanDisplayValue(token).toLowerCase();
  const chakra = Object.entries(CK).find(([key, item]) => raw.includes(key.toLowerCase()) || raw.includes(item.l.toLowerCase()));
  if (chakra) return chakra[1].c;
  const word = Object.entries(COLOR_WORDS).find(([name]) => raw.includes(name));
  if (word) return word[1];
  if (raw.includes("fire")) return "#ef4444";
  if (raw.includes("water")) return "#06b6d4";
  if (raw.includes("earth")) return "#22c55e";
  if (raw.includes("air")) return "#f0c75e";
  return SYS_COLORS[FIELD_SYSTEMS[String(field)]] || "#e040fb";
}

function letterColor(letter: string) {
  const palette = ["#22d3ee", "#d946ef", "#d4a847", "#ef4444", "#22c55e", "#8b5cf6", "#f97316", "#06b6d4"];
  return palette[Math.max(0, letter.toUpperCase().charCodeAt(0) - 65) % palette.length];
}

function scoreEntry(entry: CodexEntry, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const hay = [entry.sys, entry.e, ...DISPLAY_FIELDS.map((key) => entry[key] || "")].join(" ").toLowerCase();
  const name = entry.e.toLowerCase();
  let score = name === q ? 60 : name.startsWith(q) ? 38 : name.includes(q) ? 24 : 0;
  for (const token of q.split(/\s+/).filter(Boolean)) {
    if (entry.sys.toLowerCase().includes(token)) score += 8;
    if (name.includes(token)) score += 12;
    if (hay.includes(token)) score += 4;
  }
  return score;
}

function signal(entry: CodexEntry) {
  const stack = selectSignalStack(entry);
  return [...stack.core, ...stack.structure].slice(0, 4).join(" · ");
}

function Sigil({ entry }: { entry: CodexEntry }) {
  const color = entryColor(entry);
  const raw = cleanDisplayValue(entry.ge || entry.g || "circle").toLowerCase();
  return (
    <svg width="48" height="48" viewBox="0 0 54 54" aria-hidden="true" className="oracle-v12-sigil" style={{ "--sigil-color": color } as CSSProperties}>
      <circle cx="27" cy="27" r="25" fill="rgba(0,0,0,.26)" stroke={color} strokeOpacity=".4" />
      {(raw.includes("flower") || raw.includes("life")) ? (
        <>
          <circle cx="27" cy="27" r="16" fill="none" stroke={color} strokeWidth=".9" />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = Math.PI * i / 3;
            return <circle key={i} cx={27 + 9 * Math.cos(a)} cy={27 + 9 * Math.sin(a)} r="9" fill="none" stroke={color} strokeWidth=".55" opacity=".62" />;
          })}
        </>
      ) : (raw.includes("merkaba") || raw.includes("star tetrahedron")) ? (
        <>
          <polygon points="27,6 47,42 7,42" fill="none" stroke={color} strokeWidth="1.1" />
          <polygon points="27,48 47,12 7,12" fill="none" stroke="#d4a847" strokeWidth="1.1" />
        </>
      ) : (raw.includes("square") || raw.includes("cube") || raw.includes("hexahedron")) ? (
        <rect x="10" y="10" width="34" height="34" fill="none" stroke={color} strokeWidth="1.3" />
      ) : (raw.includes("triangle") || raw.includes("tetrahedron")) ? (
        <polygon points="27,6 49,45 5,45" fill="none" stroke={color} strokeWidth="1.3" />
      ) : raw.includes("hex") ? (
        <polygon points="27,5 46,16 46,38 27,49 8,38 8,16" fill="none" stroke={color} strokeWidth="1.3" />
      ) : raw.includes("vesica") ? (
        <>
          <circle cx="21" cy="27" r="15" fill="none" stroke={color} strokeWidth="1" />
          <circle cx="33" cy="27" r="15" fill="none" stroke={color} strokeWidth="1" />
        </>
      ) : (
        <circle cx="27" cy="27" r="15" fill="none" stroke={color} strokeWidth="1.3" />
      )}
      <circle cx="27" cy="27" r="3" fill={color} />
    </svg>
  );
}

function LetterGlyph({ letter }: { letter: string }) {
  const color = letterColor(letter);
  return (
    <span className="oracle-letter-sigil" style={{ "--letter-color": color } as CSSProperties}>
      <svg width="42" height="42" viewBox="0 0 54 54" aria-hidden="true">
        <circle cx="27" cy="27" r="21" fill="rgba(0,0,0,.22)" stroke={color} strokeOpacity=".55" />
        {(letter.charCodeAt(0) % 3 === 0) ? <polygon points="27,8 46,43 8,43" fill="none" stroke={color} strokeWidth="1" /> : (letter.charCodeAt(0) % 3 === 1) ? <rect x="13" y="13" width="28" height="28" fill="none" stroke={color} strokeWidth="1" /> : <circle cx="27" cy="27" r="13" fill="none" stroke={color} strokeWidth="1" />}
      </svg>
      <b>{letter}</b>
    </span>
  );
}

export default function OracleCorrespondenceDock({
  color,
  mode,
  rows,
  status,
  lastOracleText,
  onSeedOracle,
  onAskOracle,
  onSetMode,
  children,
}: Props) {
  const [surface, setSurface] = useState<Surface>("matrix");
  const [actionMode, setActionMode] = useState<ActionMode>("ORACLE");
  const [selectedSystem, setSelectedSystem] = useState("ALCHEMY");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CodexEntry>(() => codex.find((entry) => entry.e === "Citrinitas") || codex[0]);
  const [letter, setLetter] = useState("A");
  const [decodeInput, setDecodeInput] = useState("NOMMO");
  const [decodeMode, setDecodeMode] = useState<DecodeMode>("SUPER_MATRIX");
  const [activeChakra, setActiveChakra] = useState(Object.keys(CK)[0]);
  const [synthesisMode, setSynthesisMode] = useState<SynthesisMode>("oracle");
  const [synthesisOpen, setSynthesisOpen] = useState(false);
  const [surfaceOpen, setSurfaceOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);

  const systemEntries = useMemo(() => codex.filter((entry) => entry.sys === selectedSystem), [selectedSystem]);
  const matches = useMemo(() => {
    const q = query.trim();
    if (!q) return systemEntries.map((entry) => ({ entry, score: 0 }));
    return codex.map((entry) => ({ entry, score: scoreEntry(entry, q) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 48);
  }, [query, systemEntries]);
  const symbols = useMemo(() => codex.filter((entry) => entry.ge || entry.sy || entry.g || entry.ps).slice(0, 72), []);
  const entangled = useMemo(() => findEntanglements(selected, codex, 14), [selected]);
  const chakraEntries = useMemo(() => codex.filter((entry) => String(entry.ch || "").includes(activeChakra)).slice(0, 40), [activeChakra]);
  const lastMaterialized = useMemo(() => {
    if (!lastOracleText) return [];
    const lower = lastOracleText.toLowerCase();
    return codex.filter((entry) => entry.e.length > 2 && lower.includes(entry.e.toLowerCase())).slice(0, 4);
  }, [lastOracleText]);
  const synthesis = buildSynthesis(selected, synthesisMode);
  const decodedLetters = decodeInput.replace(/[^a-z]/gi, "").slice(0, 18).toUpperCase().split("").filter(Boolean);

  const askEntry = (entry: CodexEntry) => {
    onSetMode("correspondence");
    onAskOracle(`Use the shared COR CODEX data model to read ${entryName(entry)}. Give the strongest correspondences, a human meaning, and one chamber path from this node.`);
  };

  const seedEntry = (entry: CodexEntry) => {
    onSetMode("correspondence");
    onSeedOracle(`Read ${entryName(entry)} through the correspondence lattice. Use planet, zodiac, element, tarot, geometry, body, materia, and myth only where they cohere.`);
  };

  const selectEntry = (entry: CodexEntry) => {
    setSelected(entry);
    setSelectedSystem(entry.sys);
  };

  const selectSystem = (system: string) => {
    const first = codex.find((entry) => entry.sys === system);
    setSelectedSystem(system);
    setSurface("matrix");
    setQuery("");
    setMatrixOpen(false);
    if (first) setSelected(first);
  };

  const runMode = (entry: CodexEntry, nextAction = actionMode) => {
    if (nextAction === "ORACLE") askEntry(entry);
    if (nextAction === "DECODE") {
      onSetMode("etymology");
      onSeedOracle(`Decode ${entryName(entry)} through the COR CODEX super matrix and alphabet ontology. Include the living links that matter.`);
    }
    if (nextAction === "ENTANGLE") {
      onSetMode("correspondence");
      onSeedOracle(`Entangle ${entryName(entry)} with its closest symbolic neighbors across all 27 correspondence fields. Show bridges, tensions, and linked nodes.`);
    }
  };

  const pickToken = (token: string, field: EntryField) => {
    const linked = findEntryForToken(token, field);
    if (linked) {
      selectEntry(linked);
      setSurface("matrix");
      return;
    }
    setQuery(cleanDisplayValue(token));
    setSurface("matrix");
  };

  const showFocusedNode = query.trim() || surface === "matrix" || surface === "symbols" || surface === "clusters";

  const focusedNodePanel = (
    <div className="oracle-system-focus oracle-system-focus-live">
      <div className="oracle-dock-kicker">Focused Node - {actionMode}</div>
      <EntryHeader entry={selected} />
      <p>{signal(selected)}</p>
      <div className="oracle-context-actions">
        <button onClick={() => runMode(selected, "ENTANGLE")}>Entangle</button>
        <button onClick={() => runMode(selected, "DECODE")}>Decode</button>
        <button onClick={() => runMode(selected, "ORACLE")}>Oracle</button>
        <button onClick={() => setSynthesisOpen(true)}>Synthesis</button>
      </div>
      <details
        className="oracle-focus-details"
        open={matrixOpen}
        onToggle={(event) => setMatrixOpen(event.currentTarget.open)}
      >
        <summary>Reveal Correspondence Matrix</summary>
        <FieldMatrix entry={selected} onToken={pickToken} />
      </details>
    </div>
  );

  const renderSurface = () => {
    if (surface === "matrix") return <SystemCollection entries={matches.map((item) => item.entry)} selected={selected} system={query.trim() ? "Search" : selectedSystem} onSelect={selectEntry} />;
    if (surface === "symbols") return <SymbolPanel symbols={symbols} selected={selected} onSelect={selectEntry} />;
    if (surface === "letters") return <LetterPanel letter={letter} setLetter={setLetter} onSeedOracle={onSeedOracle} />;
    if (surface === "decode") return <DecodePanel decodeInput={decodeInput} setDecodeInput={setDecodeInput} decodeMode={decodeMode} setDecodeMode={setDecodeMode} decodedLetters={decodedLetters} onAskOracle={onAskOracle} onSelect={selectEntry} />;
    if (surface === "chakra") return <ChakraPanel activeChakra={activeChakra} setActiveChakra={setActiveChakra} entries={chakraEntries} onSelect={selectEntry} />;
    return <NodeList entries={entangled.map((item) => item.entry)} selected={selected} onSelect={selectEntry} onRun={(entry) => runMode(entry, "ENTANGLE")} />;
  };

  return (
    <section
      className="oracle-dock"
      style={{ "--dock-color": color } as CSSProperties}
      aria-label="Embedded correspondence support system"
    >
      <div className="oracle-dock-body">
        <aside className="oracle-dock-left oracle-v12-left">
          <div className="oracle-dock-kicker">v12 Action Modes</div>
          <div className="oracle-v12-action-row">
            {(["ENTANGLE", "DECODE", "ORACLE"] as ActionMode[]).map((item) => (
              <button key={item} data-active={actionMode === item} onClick={() => setActionMode(item)}>{item}</button>
            ))}
          </div>
          <input className="oracle-v12-search" value={query} onChange={(event) => { setQuery(event.target.value); setSurface("matrix"); }} placeholder="Search the super matrix..." />
          <div className="oracle-dock-kicker">Menus</div>
          <div className="oracle-dock-surfaces oracle-dock-surfaces-vertical">
            {[
              ["matrix", "Matrix"], ["symbols", "Symbols"], ["letters", "Letters"], ["decode", "Decode"], ["chakra", "Chakra Journey"], ["clusters", "Clusters"],
            ].map(([id, label]) => <button key={id} data-active={surface === id} onClick={() => setSurface(id as Surface)}>{label}</button>)}
          </div>
          {surface === "letters" && <LetterGrid letter={letter} setLetter={setLetter} compact />}
          {surface === "chakra" && <ChakraButtons activeChakra={activeChakra} setActiveChakra={setActiveChakra} />}
          <div className="oracle-dock-kicker">27-System Lattice</div>
          <div className="oracle-v12-system-list">
            {CODEX_SYSTEMS.map((system) => (
              <button key={system} data-active={selectedSystem === system} onClick={() => selectSystem(system)} style={{ "--node-color": SYS_COLORS[system] || "#e040fb" } as CSSProperties}>
                <span />
                <strong>{system.replaceAll("_", " ")}</strong>
                <em>{codex.filter((entry) => entry.sys === system).length}</em>
              </button>
            ))}
          </div>
          <button className="oracle-open-surface" onClick={() => setSurfaceOpen(true)}>Open {surface}</button>
          <div className="oracle-dock-status">{status} - {mode}</div>
          <div className="oracle-dock-count">{rows || codex.length} shared entities</div>
        </aside>

        {children ? <div className="oracle-dock-oracle-center">{children}</div> : <div className="oracle-dock-primary">{renderSurface()}</div>}

        <aside className="oracle-dock-context oracle-v12-right">
          {showFocusedNode && focusedNodePanel}
          {query.trim() ? (
            <>
              <div className="oracle-dock-kicker">Responsive Search</div>
              <div className="oracle-v12-right-title">{matches.length} Results</div>
              <NodeList entries={matches.map((item) => item.entry)} selected={selected} onSelect={selectEntry} onRun={runMode} />
            </>
          ) : surface === "letters" ? (
            <LetterPanel letter={letter} setLetter={setLetter} onSeedOracle={onSeedOracle} />
          ) : surface === "decode" ? (
            <DecodePanel decodeInput={decodeInput} setDecodeInput={setDecodeInput} decodeMode={decodeMode} setDecodeMode={setDecodeMode} decodedLetters={decodedLetters} onAskOracle={onAskOracle} onSelect={selectEntry} />
          ) : surface === "chakra" ? (
            <ChakraPanel activeChakra={activeChakra} setActiveChakra={setActiveChakra} entries={chakraEntries} onSelect={selectEntry} />
          ) : surface === "symbols" ? (
            <SymbolPanel symbols={symbols} selected={selected} onSelect={selectEntry} />
          ) : surface === "clusters" ? (
            <NodeList entries={entangled.map((item) => item.entry)} selected={selected} onSelect={selectEntry} onRun={(entry) => runMode(entry, "ENTANGLE")} />
          ) : (
            <>
              <SystemCollection entries={systemEntries} selected={selected} system={selectedSystem} onSelect={selectEntry} />
              {lastMaterialized.length > 0 && <NodeList entries={lastMaterialized} selected={selected} onSelect={selectEntry} onRun={runMode} compact />}
            </>
          )}
        </aside>
      </div>

      {synthesisOpen && (
        <div className="oracle-synthesis-pop">
          <div className="oracle-synthesis-card">
            <button className="oracle-pop-close" onClick={() => setSynthesisOpen(false)}>Close</button>
            <div className="oracle-dock-kicker">Embedded Synthesis</div>
            <h3>{synthesis.title}</h3>
            <div className="oracle-dock-surfaces">
              {[
                ["oracle", "Oracle"],
                ["mythic", "Mythic"],
                ["alchemical", "Alchemical"],
                ["clinical_symbolic", "Clinical"],
                ["xenolinguistic", "Xeno"],
              ].map(([id, label]) => (
                <button key={id} data-active={synthesisMode === id} onClick={() => setSynthesisMode(id as SynthesisMode)}>{label}</button>
              ))}
            </div>
            <p className="oracle-occult">{synthesis.displayText}</p>
            <div className="oracle-guide">
              <strong>Guide Translation</strong>
              <p>{synthesis.guideText}</p>
            </div>
            <div className="oracle-guide">
              <strong>Narration Transcript</strong>
              <p>{synthesis.narrationText}</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .oracle-dock {
          margin: 0 auto 18px;
          border: 1px solid rgba(255,255,255,.08);
          background: linear-gradient(180deg, rgba(5,5,12,.54), rgba(0,0,0,.36));
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 0 42px color-mix(in srgb, var(--dock-color) 10%, transparent), inset 0 1px 0 rgba(255,255,255,.03);
          padding: 12px;
        }
        .oracle-dock-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }
        .oracle-dock-kicker {
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          letter-spacing: .24em;
          text-transform: uppercase;
          color: rgba(212,168,71,.58);
        }
        .oracle-dock-title {
          margin-top: 3px;
          font-family: 'Cinzel', serif;
          font-size: 12px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: rgba(237,233,246,.86);
        }
        .oracle-dock-status {
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: color-mix(in srgb, var(--dock-color) 78%, rgba(237,233,246,.5));
          border: 1px solid rgba(255,255,255,.08);
          padding: 6px 8px;
        }
        .oracle-dock-surfaces, .oracle-context-actions, .oracle-chip-row, .oracle-letter-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .oracle-dock-surfaces button, .oracle-context-actions button, .oracle-decode button, .oracle-letter-read button, .oracle-materialized-mini button {
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(0,0,0,.32);
          color: rgba(237,233,246,.58);
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          letter-spacing: .14em;
          text-transform: uppercase;
          padding: 7px 9px;
          transition: all .18s ease;
        }
        .oracle-dock-surfaces button[data-active="true"], .oracle-dock-surfaces button:hover, .oracle-context-actions button:hover {
          border-color: color-mix(in srgb, var(--dock-color) 48%, transparent);
          color: rgba(237,233,246,.96);
          background: color-mix(in srgb, var(--dock-color) 10%, transparent);
        }
        .oracle-dock-body {
          display: grid;
          grid-template-columns: minmax(0,1fr) 280px;
          gap: 10px;
          margin-top: 10px;
        }
        .oracle-dock-primary, .oracle-dock-context, .oracle-synthesis-card {
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(0,0,0,.26);
          padding: 10px;
        }
        .oracle-dock-primary input, .oracle-decode input {
          width: 100%;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(0,0,0,.38);
          color: rgba(237,233,246,.9);
          padding: 9px 10px;
          outline: none;
          margin-bottom: 8px;
        }
        .oracle-dock-list {
          display: grid;
          gap: 7px;
          max-height: 220px;
          overflow: auto;
        }
        .oracle-node-row {
          display: grid;
          grid-template-columns: auto minmax(0,1fr) auto;
          gap: 9px;
          align-items: center;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.025);
          padding: 8px;
        }
        .oracle-node-row strong, .oracle-focus-card strong {
          display: block;
          font-family: 'Cinzel', serif;
          font-size: 12px;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: rgba(237,233,246,.9);
        }
        .oracle-node-row span, .oracle-focus-card span {
          display: block;
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: rgba(237,233,246,.32);
        }
        .oracle-node-actions {
          display: flex;
          gap: 4px;
        }
        .oracle-node-actions button {
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(0,0,0,.28);
          color: rgba(237,233,246,.52);
          font-size: 8px;
          padding: 5px 6px;
        }
        .oracle-symbol-cloud {
          display: grid;
          grid-template-columns: repeat(auto-fill,minmax(104px,1fr));
          gap: 7px;
          max-height: 236px;
          overflow: auto;
        }
        .oracle-symbol-cloud button {
          display: grid;
          justify-items: center;
          gap: 5px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.025);
          color: rgba(237,233,246,.62);
          padding: 8px 6px;
          font-size: 10px;
        }
        .oracle-letter-grid {
          display: grid;
          grid-template-columns: repeat(13,1fr);
          gap: 4px;
        }
        .oracle-letter-grid button {
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(0,0,0,.25);
          color: rgba(237,233,246,.54);
          padding: 7px 0;
        }
        .oracle-letter-grid button[data-active="true"] {
          border-color: rgba(34,211,238,.48);
          color: #22d3ee;
        }
        .oracle-letter-read {
          margin-top: 8px;
          border: 1px solid rgba(255,255,255,.07);
          padding: 9px;
        }
        .oracle-letter-read strong {
          font-family: 'Cinzel', serif;
          font-size: 24px;
          color: #22d3ee;
        }
        .oracle-letter-read p, .oracle-dock-context p, .oracle-guide p {
          color: rgba(237,233,246,.62);
          font-size: 12px;
          line-height: 1.55;
          margin: 6px 0;
        }
        .oracle-focus-card {
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }
        .oracle-chip-row span, .oracle-letter-strip span {
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.025);
          color: rgba(237,233,246,.56);
          padding: 4px 6px;
          font-size: 10px;
        }
        .oracle-context-actions {
          margin-top: 8px;
        }
        .oracle-materialized-mini {
          margin-top: 10px;
          display: grid;
          gap: 5px;
        }
        .oracle-synthesis-pop {
          position: fixed;
          inset: 0;
          z-index: 90;
          display: grid;
          place-items: center;
          background: rgba(0,0,0,.68);
          backdrop-filter: blur(10px);
          padding: 18px;
        }
        .oracle-synthesis-card {
          width: min(760px,100%);
          max-height: calc(100vh - 40px);
          overflow: auto;
          box-shadow: 0 0 60px rgba(0,0,0,.68), 0 0 38px color-mix(in srgb, var(--dock-color) 20%, transparent);
        }
        .oracle-pop-close {
          float: right;
          border: 1px solid rgba(255,255,255,.1);
          background: rgba(0,0,0,.42);
          color: rgba(237,233,246,.62);
          padding: 7px 10px;
        }
        .oracle-synthesis-card h3 {
          font-family: 'Cinzel', serif;
          font-size: 19px;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: rgba(237,233,246,.92);
          margin: 8px 0;
        }
        .oracle-occult {
          font-family: 'Cormorant Garamond', serif;
          font-size: 19px;
          line-height: 1.55;
          color: rgba(237,233,246,.86);
          border: 1px solid color-mix(in srgb, var(--dock-color) 28%, rgba(255,255,255,.08));
          padding: 12px;
          margin-top: 10px;
          background: color-mix(in srgb, var(--dock-color) 8%, transparent);
        }
        .oracle-guide {
          border: 1px solid rgba(255,255,255,.08);
          padding: 10px;
          margin-top: 8px;
        }
        .oracle-dock { border: 0; background: transparent; box-shadow: none; padding: 0; }
        .oracle-dock-body { grid-template-columns: 300px minmax(0,1fr) 430px; gap: 16px; margin-top: 0; align-items: start; }
        .oracle-dock-left, .oracle-dock-primary, .oracle-dock-context {
          border: 1px solid rgba(255,255,255,.07);
          background: linear-gradient(180deg,rgba(9,8,16,.68),rgba(0,0,0,.34));
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 14px;
          padding: 12px;
        }
        .oracle-v12-left, .oracle-v12-right {
          overflow: visible;
          max-height: none;
        }
        .oracle-v12-left {
          display: flex;
          flex-direction: column;
          gap: 7px;
          background:
            radial-gradient(circle at 10% 0%, rgba(34,211,238,.08), transparent 32%),
            radial-gradient(circle at 85% 12%, rgba(217,70,239,.13), transparent 38%),
            linear-gradient(180deg, rgba(10,9,18,.68), rgba(0,0,0,.34));
        }
        .oracle-v12-right {
          background:
            radial-gradient(circle at 12% 8%, color-mix(in srgb,var(--dock-color) 15%,transparent), transparent 38%),
            linear-gradient(180deg,rgba(8,8,14,.72),rgba(0,0,0,.36));
        }
        .oracle-dock-oracle-center { min-width: 0; display: flex; flex-direction: column; }
        .oracle-v12-action-row { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 6px; }
        .oracle-v12-action-row button, .oracle-open-surface {
          border: 1px solid rgba(255,255,255,.08);
          background: linear-gradient(180deg,rgba(255,255,255,.035),rgba(0,0,0,.22));
          color: rgba(237,233,246,.55);
          font-family:'JetBrains Mono',monospace;
          font-size: 7px;
          letter-spacing: .16em;
          text-transform: uppercase;
          padding: 8px 7px;
        }
        .oracle-v12-action-row button[data-active="true"], .oracle-open-surface:hover {
          border-color: color-mix(in srgb,var(--dock-color) 52%,rgba(255,255,255,.08));
          color: rgba(237,233,246,.94);
          background: color-mix(in srgb,var(--dock-color) 12%,rgba(0,0,0,.34));
        }
        .oracle-v12-search { width:100%; border:1px solid rgba(34,211,238,.16); background:rgba(0,0,0,.38); color:rgba(237,233,246,.9); font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.08em; padding:10px 9px; outline:none; margin-bottom:8px; }
        .oracle-dock-surfaces-vertical { flex-direction: column; margin: 9px 0; }
        .oracle-dock-surfaces-vertical button { width: 100%; justify-content: flex-start; text-align: left; }
        .oracle-v12-system-list { display:grid; gap:6px; max-height:none; overflow:visible; padding-right:0; }
        .oracle-v12-system-list button {
          display:grid;
          grid-template-columns:9px 1fr auto;
          align-items:center;
          gap:8px;
          border:1px solid rgba(255,255,255,.065);
          background:linear-gradient(90deg,color-mix(in srgb,var(--node-color) 5%,rgba(0,0,0,.35)),rgba(0,0,0,.22));
          color:rgba(237,233,246,.48);
          font-family:'JetBrains Mono',monospace;
          font-size:7px;
          letter-spacing:.15em;
          text-transform:uppercase;
          padding:8px 9px;
          text-align:left;
        }
        .oracle-v12-system-list button span { width:7px; height:7px; border:1px solid var(--node-color); background:color-mix(in srgb,var(--node-color) 24%,transparent); box-shadow:0 0 10px color-mix(in srgb,var(--node-color) 45%,transparent); }
        .oracle-v12-system-list button em { font-style: normal; color: color-mix(in srgb,var(--node-color) 68%,rgba(237,233,246,.42)); }
        .oracle-v12-system-list button[data-active="true"], .oracle-v12-system-list button:hover { border-color:color-mix(in srgb,var(--node-color) 52%,rgba(255,255,255,.08)); color:rgba(237,233,246,.92); }
        .oracle-left-mini-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:4px; }
        .oracle-left-mini-grid button, .oracle-left-chakras button { border:1px solid rgba(255,255,255,.07); background:rgba(0,0,0,.28); color:rgba(237,233,246,.5); font-family:'JetBrains Mono',monospace; font-size:8px; letter-spacing:.12em; padding:6px 4px; text-transform:uppercase; }
        .oracle-left-mini-grid button[data-active="true"] { border-color:color-mix(in srgb,var(--letter-color) 62%,rgba(255,255,255,.08)); color:color-mix(in srgb,var(--letter-color) 78%,white); background:color-mix(in srgb,var(--letter-color) 12%,rgba(0,0,0,.28)); }
        .oracle-left-chakras { display:grid; gap:4px; }
        .oracle-left-chakras button { border-color:color-mix(in srgb,var(--node-color) 32%,rgba(255,255,255,.06)); color:color-mix(in srgb,var(--node-color) 64%,rgba(237,233,246,.55)); text-align:left; }
        .oracle-left-chakras button[data-active="true"], .oracle-left-chakras button:hover { background:color-mix(in srgb,var(--node-color) 10%,rgba(0,0,0,.3)); color:rgba(237,233,246,.95); }
        .oracle-v12-right-title { font-family:'Cinzel',serif; font-size:15px; letter-spacing:.12em; text-transform:uppercase; color:rgba(237,233,246,.88); margin:5px 0 9px; }
        .oracle-system-collection { display:grid; gap:8px; max-height:none; overflow:visible; padding-right:0; }
        .oracle-system-collection button { display:grid; grid-template-columns:auto minmax(0,1fr); gap:9px; align-items:center; border:1px solid color-mix(in srgb,var(--node-color) 34%,rgba(255,255,255,.06)); background:radial-gradient(circle at 0 0,color-mix(in srgb,var(--node-color) 20%,transparent),transparent 44%),linear-gradient(90deg,color-mix(in srgb,var(--node-color) 8%,rgba(0,0,0,.46)),rgba(0,0,0,.24)); color:rgba(237,233,246,.74); padding:8px; text-align:left; }
        .oracle-system-collection button[data-active="true"], .oracle-system-collection button:hover { border-color:color-mix(in srgb,var(--node-color) 70%,rgba(255,255,255,.1)); box-shadow:inset 3px 0 0 var(--node-color),0 0 18px color-mix(in srgb,var(--node-color) 15%,transparent); }
        .oracle-system-collection strong { display:block; font-family:'Cinzel',serif; font-size:12px; letter-spacing:.11em; text-transform:uppercase; color:rgba(237,233,246,.9); }
        .oracle-system-collection em { display:block; margin-top:3px; font-family:'JetBrains Mono',monospace; font-size:7px; letter-spacing:.12em; text-transform:uppercase; color:color-mix(in srgb,var(--node-color) 62%,rgba(237,233,246,.38)); font-style:normal; }
        .oracle-system-focus { margin-top:12px; border-top:1px solid rgba(255,255,255,.06); padding-top:11px; }
        .oracle-system-focus-live {
          position: sticky;
          top: 76px;
          z-index: 6;
          margin: 0 0 12px;
          border: 1px solid color-mix(in srgb,var(--dock-color) 30%,rgba(255,255,255,.07));
          border-radius: 12px;
          padding: 11px;
          background:
            radial-gradient(circle at 0 0,color-mix(in srgb,var(--dock-color) 16%,transparent),transparent 42%),
            linear-gradient(180deg,rgba(8,8,14,.94),rgba(0,0,0,.74));
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          box-shadow: 0 12px 28px rgba(0,0,0,.28), 0 0 24px color-mix(in srgb,var(--dock-color) 10%,transparent);
        }
        .oracle-focus-details {
          margin-top: 10px;
        }
        .oracle-focus-details summary {
          cursor: pointer;
          list-style: none;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 42px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 8px;
          padding: 12px 14px;
          background:
            linear-gradient(270deg, rgba(239,68,68,.24), rgba(245,158,11,.24), rgba(234,179,8,.24), rgba(34,197,94,.24), rgba(34,211,238,.24), rgba(139,92,246,.24), rgba(217,70,239,.24), rgba(239,68,68,.24)),
            rgba(0,0,0,.32);
          background-size: 240% 100%;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.08),
            0 0 20px rgba(217,70,239,.12),
            0 0 20px rgba(34,211,238,.10);
          font-family:'Cinzel',serif;
          font-size: 12px;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: rgba(237,233,246,.92);
          text-align: center;
          transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease, filter .18s ease;
          animation: oracleRevealRainbow 4.8s linear infinite;
        }
        .oracle-focus-details summary::-webkit-details-marker {
          display: none;
        }
        .oracle-focus-details summary::before {
          content: '';
          width: 7px;
          height: 7px;
          margin-right: 9px;
          border-radius: 999px;
          background: linear-gradient(135deg, #ef4444, #f59e0b, #22c55e, #22d3ee, #d946ef);
          box-shadow: 0 0 10px rgba(34,211,238,.65), 0 0 16px rgba(217,70,239,.45);
          flex: 0 0 auto;
        }
        .oracle-focus-details summary:hover {
          transform: translateY(-1px);
          border-color: rgba(237,233,246,.22);
          filter: saturate(1.25);
          animation-duration: 2.8s;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.1),
            0 0 24px rgba(217,70,239,.18),
            0 0 28px rgba(34,211,238,.16);
        }
        .oracle-focus-details[open] summary {
          margin-bottom: 10px;
          border-color: color-mix(in srgb,var(--dock-color) 48%,rgba(255,255,255,.14));
          background:
            linear-gradient(270deg, rgba(239,68,68,.28), rgba(245,158,11,.28), rgba(234,179,8,.28), rgba(34,197,94,.28), rgba(34,211,238,.28), rgba(139,92,246,.28), rgba(217,70,239,.28), rgba(239,68,68,.28)),
            rgba(0,0,0,.38);
          background-size: 240% 100%;
        }
        @keyframes oracleRevealRainbow {
          0% { background-position: 100% 50%; filter: hue-rotate(0deg) saturate(1.2); }
          100% { background-position: 0% 50%; filter: hue-rotate(360deg) saturate(1.35); }
        }
        .oracle-node-row { background:radial-gradient(circle at 0 0,color-mix(in srgb,var(--node-color) 13%,transparent),transparent 44%),linear-gradient(90deg,color-mix(in srgb,var(--node-color) 5%,rgba(255,255,255,.018)),rgba(255,255,255,.018)); }
        .oracle-node-row[data-active="true"], .oracle-node-row:hover { border-color:color-mix(in srgb,var(--node-color) 44%,rgba(255,255,255,.07)); }
        .oracle-v12-sigil { color:var(--sigil-color); filter:drop-shadow(0 0 8px color-mix(in srgb,var(--sigil-color) 42%,transparent)); }
        .oracle-symbol-cloud { grid-template-columns:repeat(auto-fill,minmax(88px,1fr)); max-height:none; overflow:visible; }
        .oracle-symbol-cloud button[data-active="true"], .oracle-symbol-cloud button:hover { border-color:color-mix(in srgb,var(--sigil-color,var(--dock-color)) 45%,rgba(255,255,255,.08)); color:rgba(237,233,246,.95); }
        .oracle-letter-grid { grid-template-columns:repeat(4,minmax(0,1fr)); gap:7px; }
        .oracle-letter-grid button { min-height:58px; display:grid; place-items:center; padding:5px; }
        .oracle-letter-grid button[data-active="true"], .oracle-letter-grid button:hover { border-color:color-mix(in srgb,var(--letter-color) 58%,rgba(255,255,255,.08)); background:color-mix(in srgb,var(--letter-color) 10%,rgba(0,0,0,.32)); }
        .oracle-letter-sigil { position:relative; display:inline-grid; place-items:center; color:var(--letter-color); filter:drop-shadow(0 0 11px color-mix(in srgb,var(--letter-color) 42%,transparent)); }
        .oracle-letter-sigil b { position:absolute; inset:0; display:grid; place-items:center; font-family:'Cinzel',serif; font-size:18px; color:color-mix(in srgb,var(--letter-color) 80%,white); }
        .oracle-letter-read { background:radial-gradient(circle at 12% 0%,color-mix(in srgb,var(--letter-color,#22d3ee) 14%,transparent),transparent 38%),rgba(255,255,255,.018); }
        .oracle-letter-read-head { display:grid; grid-template-columns:auto minmax(0,1fr); align-items:center; gap:10px; }
        .oracle-letter-read-head span { display:block; font-family:'JetBrains Mono',monospace; font-size:7px; letter-spacing:.18em; text-transform:uppercase; color:color-mix(in srgb,var(--letter-color,#22d3ee) 62%,rgba(237,233,246,.42)); }
        .oracle-letter-token-row span, .oracle-letter-strip span { border-color:color-mix(in srgb,var(--chip-color) 36%,rgba(255,255,255,.08)); background:color-mix(in srgb,var(--chip-color) 9%,rgba(0,0,0,.26)); color:color-mix(in srgb,var(--chip-color) 68%,rgba(237,233,246,.76)); }
        .oracle-decode-mode-row { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; margin-bottom:8px; }
        .oracle-decode-card { border:1px solid rgba(255,255,255,.07); background:radial-gradient(circle at 0 0,color-mix(in srgb,var(--letter-color,#22d3ee) 14%,transparent),transparent 38%),linear-gradient(180deg,rgba(255,255,255,.028),rgba(0,0,0,.24)); padding:9px; box-shadow:inset 2px 0 0 color-mix(in srgb,var(--letter-color,#22d3ee) 82%,transparent); }
        .oracle-decode-card-head { display:grid; grid-template-columns:auto minmax(0,1fr); gap:10px; align-items:start; }
        .oracle-decode-matrix-links { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
        .oracle-decode-matrix-links button { display:inline-flex; align-items:center; gap:5px; border:1px solid color-mix(in srgb,var(--node-color) 38%,rgba(255,255,255,.08)); background:color-mix(in srgb,var(--node-color) 8%,rgba(0,0,0,.32)); color:color-mix(in srgb,var(--node-color) 72%,rgba(237,233,246,.76)); font-family:'JetBrains Mono',monospace; font-size:7px; letter-spacing:.12em; text-transform:uppercase; padding:4px 6px; }
        .oracle-v12-field-matrix { display:grid; gap:6px; margin-top:10px; max-height:none; overflow:visible; padding-right:0; }
        .oracle-v12-list-tall { max-height:none; overflow:visible; }
        .oracle-v12-field-row { display:grid; grid-template-columns:minmax(92px,.34fr) minmax(0,1fr); gap:8px; align-items:start; border:1px solid rgba(255,255,255,.06); background:rgba(255,255,255,.02); padding:7px 8px; }
        .oracle-v12-field-row b { font-family:'JetBrains Mono',monospace; font-size:7px; letter-spacing:.16em; text-transform:uppercase; color:color-mix(in srgb,var(--dock-color) 68%,rgba(237,233,246,.42)); }
        .oracle-v12-token-cloud { display:flex; flex-wrap:wrap; gap:5px; }
        .oracle-v12-token-cloud button, .oracle-v12-token-cloud em { border:1px solid color-mix(in srgb,var(--chip-color,var(--dock-color)) 36%,rgba(255,255,255,.08)); background:color-mix(in srgb,var(--chip-color,var(--dock-color)) 8%,rgba(0,0,0,.32)); color:color-mix(in srgb,var(--chip-color,var(--dock-color)) 76%,rgba(237,233,246,.78)); font-family:'JetBrains Mono',monospace; font-size:8px; letter-spacing:.06em; line-height:1.25; padding:4px 6px; text-align:left; }
        @media (max-width: 900px) {
          .oracle-dock-body { grid-template-columns: 1fr; }
          .oracle-dock-context { order: -1; }
          .oracle-letter-grid { grid-template-columns: repeat(7,1fr); }
          .oracle-dock-head { align-items: flex-start; flex-direction: column; }
        }
      `}</style>
    </section>
  );
}

function EntryHeader({ entry }: { entry: CodexEntry }) {
  return (
    <div className="oracle-focus-card" style={{ "--node-color": entryColor(entry) } as CSSProperties}>
      <Sigil entry={entry} />
      <div><strong>{entryName(entry)}</strong><span>{entry.sys}</span></div>
    </div>
  );
}

function SystemCollection({ entries, selected, system, onSelect }: { entries: CodexEntry[]; selected: CodexEntry; system: string; onSelect: (entry: CodexEntry) => void }) {
  return (
    <div>
      <div className="oracle-dock-kicker">System Collection - {system.replaceAll("_", " ")}</div>
      <div className="oracle-v12-right-title">{entries.length} Nodes</div>
      <div className="oracle-system-collection">
        {entries.map((entry) => (
          <button key={`${entry.sys}:${entry.e}`} data-active={entry.sys === selected.sys && entry.e === selected.e} onClick={() => onSelect(entry)} style={{ "--node-color": entryColor(entry) } as CSSProperties}>
            <Sigil entry={entry} />
            <span><strong>{entryName(entry)}</strong><em>{fieldValue(entry, "el") || fieldValue(entry, "pl") || entry.sys}</em></span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FieldMatrix({ entry, onToken }: { entry: CodexEntry; onToken?: (token: string, field: EntryField) => void }) {
  return (
    <div className="oracle-v12-field-matrix">
      {DISPLAY_FIELDS.map((key) => {
        const tokens = splitTokens(fieldValue(entry, key));
        return (
          <div key={key} className="oracle-v12-field-row" data-empty={tokens.length ? "false" : "true"}>
            <b>{FIELD_LABELS[key] || key}</b>
            <span className="oracle-v12-token-cloud">
              {tokens.length ? tokens.map((token) => {
                const linked = findEntryForToken(token, key);
                return <button key={`${String(key)}:${token}`} data-linked={linked ? "true" : "false"} onClick={() => onToken?.(token, key)} style={{ "--chip-color": fieldChipColor(key, token) } as CSSProperties}>{token}</button>;
              }) : <em>-</em>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function NodeList({ entries, selected, onSelect, onRun, compact = false }: { entries: CodexEntry[]; selected: CodexEntry; onSelect: (entry: CodexEntry) => void; onRun: (entry: CodexEntry) => void; compact?: boolean }) {
  return (
    <div className={`oracle-dock-list oracle-v12-list-tall ${compact ? "oracle-v12-list-compact" : ""}`}>
      {entries.map((entry) => <NodeRow key={`${entry.sys}:${entry.e}`} entry={entry} selected={selected} onSelect={onSelect} onRun={onRun} />)}
    </div>
  );
}

function NodeRow({ entry, selected, onSelect, onRun }: { entry: CodexEntry; selected: CodexEntry; onSelect: (entry: CodexEntry) => void; onRun: (entry: CodexEntry) => void }) {
  return (
    <div className="oracle-node-row" data-active={entry.sys === selected.sys && entry.e === selected.e} style={{ "--node-color": entryColor(entry) } as CSSProperties}>
      <button onClick={() => onSelect(entry)} style={{ border: 0, background: "transparent", padding: 0 }}><Sigil entry={entry} /></button>
      <button onClick={() => onSelect(entry)} style={{ border: 0, background: "transparent", padding: 0, textAlign: "left" }}><strong>{entryName(entry)}</strong><span>{entry.sys} - {signal(entry)}</span></button>
      <div className="oracle-node-actions"><button onClick={() => onRun(entry)}>Run</button></div>
    </div>
  );
}

function SymbolPanel({ symbols, selected, onSelect }: { symbols: CodexEntry[]; selected: CodexEntry; onSelect: (entry: CodexEntry) => void }) {
  return (
    <div>
      <div className="oracle-dock-kicker">Geometry / Symbol Surface</div>
      <div className="oracle-symbol-cloud">
        {symbols.map((entry) => (
          <button key={`${entry.sys}:${entry.e}`} data-active={selected.sys === entry.sys && selected.e === entry.e} onClick={() => onSelect(entry)} style={{ "--sigil-color": entryColor(entry) } as CSSProperties}>
            <Sigil entry={entry} /><span>{entryName(entry)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LetterGrid({ letter, setLetter, compact = false }: { letter: string; setLetter: (letter: string) => void; compact?: boolean }) {
  return (
    <div className={compact ? "oracle-left-mini-grid" : "oracle-letter-grid oracle-letter-grid-v12"}>
      {LETTERS.map((item) => (
        <button key={item} data-active={letter === item} onClick={() => setLetter(item)} style={{ "--letter-color": letterColor(item) } as CSSProperties}>
          {compact ? item : <LetterGlyph letter={item} />}
        </button>
      ))}
    </div>
  );
}

function LetterPanel({ letter, setLetter, onSeedOracle }: { letter: string; setLetter: (letter: string) => void; onSeedOracle: (prompt: string) => void }) {
  const active = ontology[letter];
  return (
    <div className="oracle-letter-panel" style={{ "--letter-color": letterColor(letter) } as CSSProperties}>
      <LetterGrid letter={letter} setLetter={setLetter} />
      <div className="oracle-letter-read">
        <div className="oracle-letter-read-head"><LetterGlyph letter={letter} /><div><strong>{letter}</strong><span>Alphabet Ontology</span></div></div>
        <p>{cleanDisplayValue(active?.essence || active?.summary || "Letter gate pending.")}</p>
        <div className="oracle-chip-row oracle-letter-token-row">{(active?.key || []).slice(0, 8).map((item, index) => <span key={item} style={{ "--chip-color": letterColor(String.fromCharCode(65 + index)) } as CSSProperties}>{cleanDisplayValue(item)}</span>)}</div>
        <button onClick={() => onSeedOracle(`Decode the letter ${letter} as a symbolic support node for this Oracle reading.`)}>Seed Oracle</button>
      </div>
    </div>
  );
}

function DecodePanel({ decodeInput, setDecodeInput, decodeMode, setDecodeMode, decodedLetters, onAskOracle, onSelect }: { decodeInput: string; setDecodeInput: (value: string) => void; decodeMode: DecodeMode; setDecodeMode: (mode: DecodeMode) => void; decodedLetters: string[]; onAskOracle: (prompt: string) => void; onSelect: (entry: CodexEntry) => void }) {
  return (
    <div className="oracle-decode">
      <input value={decodeInput} onChange={(event) => setDecodeInput(event.target.value)} placeholder="Decode word or name..." />
      <div className="oracle-decode-mode-row"><button data-active={decodeMode === "SUPER_MATRIX"} onClick={() => setDecodeMode("SUPER_MATRIX")}>Super Matrix</button><button data-active={decodeMode === "ALPHABET_ONTOLOGY"} onClick={() => setDecodeMode("ALPHABET_ONTOLOGY")}>Alphabet Ontology</button></div>
      <div className="oracle-letter-strip">{decodedLetters.map((item, index) => <span key={`${item}-${index}`} style={{ "--chip-color": letterColor(item) } as CSSProperties}><LetterGlyph letter={item} /></span>)}</div>
      <div className="oracle-dock-list oracle-v12-list-tall">
        {decodedLetters.map((item, index) => {
          const active = ontology[item];
          const linked = codex.filter((entry) => splitTokens(entry.ll || "").some((token) => normalizeLookup(token) === normalizeLookup(item))).slice(0, decodeMode === "SUPER_MATRIX" ? 5 : 2);
          return (
            <div key={`${item}-${index}`} className="oracle-decode-card" style={{ "--letter-color": letterColor(item) } as CSSProperties}>
              <div className="oracle-decode-card-head"><LetterGlyph letter={item} /><div><div className="oracle-dock-kicker">{item} - {decodeMode.replace("_", " ")}</div><p>{cleanDisplayValue(active?.essence || active?.summary || "No ontology node found.")}</p></div></div>
              <div className="oracle-chip-row oracle-letter-token-row">{(active?.key || []).slice(0, 5).map((key, keyIndex) => <span key={key} style={{ "--chip-color": letterColor(String.fromCharCode(65 + keyIndex + index)) } as CSSProperties}>{cleanDisplayValue(key)}</span>)}</div>
              {linked.length > 0 && <div className="oracle-decode-matrix-links">{linked.map((entry) => <button key={`${entry.sys}:${entry.e}`} onClick={() => onSelect(entry)} style={{ "--node-color": entryColor(entry) } as CSSProperties}><Sigil entry={entry} /><span>{entryName(entry)}</span></button>)}</div>}
            </div>
          );
        })}
      </div>
      <button onClick={() => onAskOracle(`Decode ${decodeInput} using the COR CODEX ${decodeMode.toLowerCase().replace("_", " ")} mode. Show letter ontology, super matrix links, and one stream from this word.`)}>Ask Oracle About Word</button>
    </div>
  );
}

function ChakraButtons({ activeChakra, setActiveChakra }: { activeChakra: string; setActiveChakra: (key: string) => void }) {
  return <div className="oracle-left-chakras">{Object.entries(CK).map(([key, item]) => <button key={key} data-active={activeChakra === key} onClick={() => setActiveChakra(key)} style={{ "--node-color": item.c } as CSSProperties}>{item.l}</button>)}</div>;
}

function ChakraPanel({ activeChakra, setActiveChakra, entries, onSelect }: { activeChakra: string; setActiveChakra: (key: string) => void; entries: CodexEntry[]; onSelect: (entry: CodexEntry) => void }) {
  return (
    <div>
      <div className="oracle-left-chakras oracle-chakra-full">{Object.entries(CK).map(([key, item]) => <button key={key} data-active={activeChakra === key} onClick={() => setActiveChakra(key)} style={{ "--node-color": item.c } as CSSProperties}><strong>{item.n}</strong>{item.l}<span>{item.s}</span></button>)}</div>
      <div className="oracle-dock-list oracle-v12-list-tall" style={{ marginTop: 8 }}>{entries.map((entry) => <NodeRow key={`${entry.sys}:${entry.e}`} entry={entry} selected={entries[0] || entry} onSelect={onSelect} onRun={onSelect} />)}</div>
    </div>
  );
}
