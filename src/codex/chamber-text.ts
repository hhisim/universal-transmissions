import type { CodexEntry } from "@/lib/codex-data";
import type {
  ChamberTextBundle,
  ResonanceBundle,
  ResonanceMode,
  StreamBundle,
  StreamMode,
  StreamNodeBundle,
  SynthesisMode,
} from "./types";
import { cleanDisplayValue, formatSignal, normalizeForSpeech, splitSignals } from "./speech-normalize";

type SignalStack = {
  core: string[];
  structure: string[];
  material: string[];
  mythic: string[];
  shadow: string[];
  virtue: string[];
};

const FIELD_LABELS: Record<string, string> = {
  al: "Alchemy",
  ar: "Archetype",
  ch: "Chakra",
  co: "Color",
  cr: "Crystal",
  de: "Deity",
  el: "Element",
  fr: "Frequency",
  ge: "Geometry",
  gm: "Geomancy",
  ic: "I Ching",
  ka: "Kabbalah",
  lh: "Hebrew Letter",
  ll: "Latin Letter",
  ma: "Major Arcana",
  me: "Metal",
  mi: "Minor Arcana",
  no: "Tone",
  nu: "Number",
  ph: "Physiology",
  pl: "Planet",
  ps: "Platonic Solid",
  pt: "Plant",
  vi: "Shadow",
  vr: "Virtue",
  zo: "Zodiac",
};

const SIGNAL_FIELDS: Array<keyof CodexEntry> = [
  "pl",
  "zo",
  "el",
  "ma",
  "ge",
  "ph",
  "ch",
  "ka",
  "nu",
  "fr",
  "me",
  "cr",
  "pt",
  "de",
  "gm",
  "ic",
  "lh",
  "ll",
  "vi",
  "vr",
];

function entryName(entry: CodexEntry) {
  return cleanDisplayValue(entry.e);
}

function list(parts: string[]) {
  return parts.filter(Boolean).join(" · ");
}

function pick(entry: CodexEntry, keys: Array<keyof CodexEntry>, limit = 1) {
  return keys.flatMap((key) => splitSignals(entry[key] as string | undefined, limit)).filter(Boolean);
}

export function selectSignalStack(entry: CodexEntry): SignalStack {
  return {
    core: pick(entry, ["pl", "zo", "el", "ma"], 2).slice(0, 5),
    structure: pick(entry, ["ge", "ph", "ch", "ka", "nu", "fr"], 2).slice(0, 5),
    material: pick(entry, ["me", "cr", "pt"], 2).slice(0, 4),
    mythic: pick(entry, ["de", "gm", "ic", "lh", "ll"], 2).slice(0, 5),
    shadow: pick(entry, ["vi"], 2).slice(0, 2),
    virtue: pick(entry, ["vr"], 2).slice(0, 2),
  };
}

export function buildSynthesis(entry: CodexEntry, mode: SynthesisMode): ChamberTextBundle {
  const name = entryName(entry);
  const stack = selectSignalStack(entry);
  const planet = formatSignal(entry.pl, "a hidden planet");
  const zodiac = formatSignal(entry.zo, "an unnamed sign");
  const element = formatSignal(entry.el, "a mixed element");
  const tarot = formatSignal(entry.ma || entry.ta || entry.o, "an unturned card");
  const geometry = formatSignal(entry.ge || entry.g, "a veiled geometry");
  const body = formatSignal(entry.ph, "the subtle body");
  const chakra = formatSignal(entry.ch, "the inner center");
  const metal = formatSignal(entry.me, "an unnamed metal");
  const crystal = formatSignal(entry.cr, "a dark crystal");
  const plant = formatSignal(entry.pt, "a ritual plant");
  const deity = formatSignal(entry.de || entry.d, "a masked presence");
  const virtue = formatSignal(entry.vr, "a usable virtue");
  const shadow = formatSignal(entry.vi, "a hidden pressure");

  const quotaLine = "Guest can sample chambers. Free deepens daily work. Initiate unlocks unlimited chamber narration.";

  if (mode === "mythic") {
    return {
      title: `${name} as Mythic Presence`,
      subtitle: `${deity} · ${tarot}`,
      displayText: `${name} rises wearing the mask of ${deity}. ${planet} sets the crown-fire; ${zodiac} bends the horizon; ${element} gives the body its weather. ${tarot} is not decoration here. It is the scene where fate asks for a human answer.`,
      guideText: `In lived life, ${name} behaves like an archetypal pressure. It may arrive as desire, ordeal, attraction, conflict, or a repeated image that will not leave you alone. Watch where ${shadow} appears, because that is where the myth has become too literal. The threshold is to embody ${virtue} without becoming possessed by the mask.`,
      narrationText: normalizeForSpeech(`${name} enters as a mythic force. Its face is ${deity}, its sky is ${planet}, and its test is ${tarot}. The human question is simple: where has this story been acting through you, and what part of it is asking to be lived with more courage and less compulsion?`),
      quotaLine,
    };
  }

  if (mode === "alchemical") {
    return {
      title: `${name} in the Vessel`,
      subtitle: `${element} · ${metal} · ${plant}`,
      displayText: `The vessel takes ${name} through ${formatSignal(entry.al, "an unnamed operation")}. ${element} supplies the heat, ${metal} remembers the fixed body, and ${plant} releases the volatile scent. ${geometry} becomes the seal: what disperses must be gathered, what hardens must be softened, what burns must reveal its salt.`,
      guideText: `${name} matters when a process is already underway. Emotionally it can feel like pressure, digestion, grief, heat, or the slow return of form after confusion. The work is not to collect every correspondence. The work is to notice what is dissolving, what is fixing, and what must be transmuted into behavior.`,
      narrationText: normalizeForSpeech(`Place ${name} in the vessel. Let ${element} heat it, let ${metal} give it weight, and let ${plant} teach it how to release. This is the chamber of process. Something in you is not broken. It is changing state.`),
      quotaLine,
    };
  }

  if (mode === "clinical_symbolic") {
    return {
      title: `${name} as Human Pattern`,
      subtitle: `${body} · ${chakra}`,
      displayText: `${name} condenses around ${body} and ${chakra}. The symbolic weather is ${element}; the regulating image is ${geometry}. Its gift is ${virtue}. Its distortion is ${shadow}.`,
      guideText: `This is the grounded reading. ${name} may show up as a body signal, a relational habit, a mood loop, or a survival strategy that once made sense. It asks you to track sensation before interpretation. Where does the body tighten, reach, defend, over-give, or go numb? That is where the symbol has become practical.`,
      narrationText: normalizeForSpeech(`${name} is not only mystical. It is also bodily. Listen for it in ${body}, in the way you react, attach, resist, or recover. The threshold is to turn the symbol into an honest question about your nervous system and your relationships.`),
      quotaLine,
    };
  }

  if (mode === "xenolinguistic") {
    const letters = list(splitSignals(entry.ll || entry.lh || name, 4));
    return {
      title: `${name} as Threshold-Language`,
      subtitle: `${letters || "utterance"} · ${formatSignal(entry.fr, "unvoiced frequency")}`,
      displayText: `${name} is an utterance before it is an object. Its letter-field opens through ${letters || "an unnamed glyph chain"}; its tone bends toward ${formatSignal(entry.fr, "a hidden frequency")}. ${geometry} is the mouth-shape of the sign. ${deity} is the listener behind the veil.`,
      guideText: `Read ${name} as a sound-force. It matters when language itself starts changing perception: the name you give something changes how you approach it. Ask what this word permits, forbids, summons, or seals. The strongest practice is to speak it slowly and notice which part of you answers.`,
      narrationText: normalizeForSpeech(`${name} is a threshold word. Do not read the glyphs aloud as inventory. Hear the force behind the name, the way it opens a door in attention. Let the sound ask: what is trying to be named, and what becomes real only when you speak it carefully?`),
      quotaLine,
    };
  }

  return {
    title: `${name} Synthesis`,
    subtitle: `${planet} · ${element} · ${tarot}`,
    displayText: `${name} shines through ${planet}, ${zodiac}, and ${element}. ${tarot} gives it a luminous face; ${geometry} gives it law; ${crystal} and ${plant} make the signal touchable. The chamber does not ask for all systems. It reveals the few correspondences that are awake together.`,
    guideText: `${name} matters when your life is asking for ${virtue}. It may arrive as a repeating mood, attraction, conflict, dream image, body sensation, or relational threshold. Notice where ${shadow} appears, then ask what wiser form of power, tenderness, clarity, or boundary wants to emerge.`,
    narrationText: normalizeForSpeech(`${name} is a luminous correspondence. Its planet is ${planet}, its element is ${element}, and its visible card is ${tarot}. In ordinary life it asks you to notice the place where pattern becomes choice. What is being revealed, and what response would make the symbol true?`),
    quotaLine,
  };
}

function valuesFor(entry: CodexEntry, key: keyof CodexEntry) {
  return splitSignals(entry[key] as string | undefined, 8);
}

function intersect(a: string[], b: string[]) {
  const bSet = new Set(b.map((item) => item.toLowerCase()));
  return a.filter((item) => bSet.has(item.toLowerCase()));
}

export function buildResonance(left: CodexEntry, right: CodexEntry, mode: ResonanceMode): ResonanceBundle {
  const a = entryName(left);
  const b = entryName(right);
  const sharedFields = SIGNAL_FIELDS.map((key) => ({
    key: FIELD_LABELS[key as string] ?? String(key),
    values: intersect(valuesFor(left, key), valuesFor(right, key)).slice(0, 3),
  })).filter((field) => field.values.length > 0).slice(0, 4);

  const frictions = SIGNAL_FIELDS.map((key) => {
    const lv = valuesFor(left, key);
    const rv = valuesFor(right, key);
    if (!lv.length || !rv.length || intersect(lv, rv).length) return null;
    return { key: FIELD_LABELS[key as string] ?? String(key), values: [lv[0], rv[0]] };
  }).filter(Boolean).slice(0, 4) as Array<{ key: string; values: string[] }>;

  const hiddenBridges = [
    { key: "Bridge", values: [formatSignal(left.vr || left.el), formatSignal(right.vr || right.el)] },
    { key: "Body", values: [formatSignal(left.ph), formatSignal(right.ph)] },
    { key: "Materia", values: [formatSignal(left.cr || left.me), formatSignal(right.cr || right.me)] },
  ].filter((field) => field.values.every((value) => value && value !== "unwritten")).slice(0, 3);

  const shared = sharedFields[0]?.values.join(" and ") || "an unnamed pressure";
  const friction = frictions[0]?.values.join(" against ") || "two different instincts";
  const bridge = hiddenBridges[0]?.values.join(" with ") || "a third listening field";
  const quotaLine = "Resonance samples are open. Save and narration depth expand with the Initiate chamber tier.";

  if (mode === "tension") {
    return {
      title: `${a} / ${b}`,
      subtitle: "Tension Field",
      sharedFields,
      frictions,
      hiddenBridges,
      displayText: `${a} presses against ${b}. Their friction is ${friction}; neither side should be collapsed into the other. The field becomes useful when the conflict is allowed to speak with precision.`,
      guideText: `This pairing matters when two values, needs, or drives are competing. One may want speed while the other wants depth; one may seek safety while the other demands transformation. Do not rush to harmony. Name the cost each side is afraid to pay.`,
      narrationText: normalizeForSpeech(`${a} and ${b} are not fighting for decoration. They reveal a real tension. Let each one say what it protects. The hidden question is: what truth becomes visible only when neither side is silenced?`),
      quotaLine,
    };
  }

  if (mode === "mirror") {
    return {
      title: `${a} / ${b}`,
      subtitle: "Mirror Field",
      sharedFields,
      frictions,
      hiddenBridges,
      displayText: `${b} reflects the concealed angle of ${a}. The mirror is ${shared}; the inversion is ${friction}. What appears opposite may be the same force seen from the other side of the veil.`,
      guideText: `Use this mode when one object seems to explain, irritate, seduce, or expose the other. The pair may show a projection: what you admire, reject, or cannot understand outside yourself. Ask what the second presence reveals about the first.`,
      narrationText: normalizeForSpeech(`${a} looks into ${b} and finds an inversion. This is the mirror chamber. What you meet outside may be a displaced part of your own pattern, asking to be recognized without shame.`),
      quotaLine,
    };
  }

  if (mode === "transformation") {
    return {
      title: `${a} / ${b}`,
      subtitle: "Third Force",
      sharedFields,
      frictions,
      hiddenBridges,
      displayText: `${a} and ${b} generate a third presence through ${bridge}. The meeting changes both: one gives contour, the other gives charge, and the bridge becomes a new ritual instruction.`,
      guideText: `This pairing matters when contact itself is transformative. The point is not agreement. The point is emergence. Ask what new behavior, image, practice, or boundary could exist only because these two symbols touched.`,
      narrationText: normalizeForSpeech(`${a} meets ${b}, and a third force appears. This is not compromise. It is emergence. Something new can be lived here if you let the encounter change both sides.`),
      quotaLine,
    };
  }

  return {
    title: `${a} / ${b}`,
    subtitle: "Harmony Field",
    sharedFields,
    frictions,
    hiddenBridges,
    displayText: `${a} and ${b} converge through ${shared}. The shared field is not sameness; it is complementarity, two symbolic bodies agreeing on a deeper current.`,
    guideText: `This pairing matters when different parts of life can cooperate. Look for where emotion, body, imagination, and relationship are already pointing in the same direction. Harmony here means aligned difference, not bland peace.`,
    narrationText: normalizeForSpeech(`${a} and ${b} find a shared current. Their harmony is not a flat agreement. It is a useful convergence, a way for two distinct forces to support the same threshold in your life.`),
    quotaLine,
  };
}

function scoreLink(seed: CodexEntry, candidate: CodexEntry) {
  if (seed === candidate) return -1;
  return SIGNAL_FIELDS.reduce<number>((score, key) => score + intersect(valuesFor(seed, key), valuesFor(candidate, key)).length, 0);
}

export function buildStream(seed: CodexEntry, allEntries: CodexEntry[], mode: StreamMode): StreamBundle {
  const seedName = entryName(seed);
  const linked = allEntries
    .map((entry) => ({ entry, score: scoreLink(seed, entry) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.entry);
  const path = [seed, ...linked].slice(0, 5);
  while (path.length < 5 && allEntries[path.length]) path.push(allEntries[path.length]);

  const quotaLine = "Stream preview is open. Longer routes, saved processions, and narration-rich gates unlock with Initiate.";
  const modeTitle: Record<StreamMode, string> = {
    dream_logic: "Dream Logic",
    chakra_ascent: "Chakra Ascent",
    planetary_descent: "Planetary Descent",
    elemental_transformation: "Elemental Transformation",
  };

  const nodeBuilders: Record<StreamMode, (entry: CodexEntry, index: number) => StreamNodeBundle> = {
    dream_logic: (entry, index) => {
      const name = entryName(entry);
      const bridge = formatSignal(entry.ge || entry.ic || entry.gm, "a hidden resemblance");
      return {
        nodeId: `${entry.sys}-${entry.e}-${index}`,
        nodeName: name,
        title: `Gate ${index + 1}: ${name}`,
        subtitle: bridge,
        displayText: `${name} appears because ${bridge} resembles the previous gate in secret. The dream does not move by logic of category; it moves by echo, color, wound, and image.`,
        guideText: `This part matters because intuitive life often connects things before the rational mind can explain them. Notice the image, memory, or feeling-tone that links this gate to the last one.`,
        narrationText: normalizeForSpeech(`${name} enters by dream logic. It may not be linear, but it is coherent. Follow the resemblance, not the label.`),
        transitionReason: `Hidden resemblance through ${bridge}`,
        quotaLine,
        entry,
      };
    },
    chakra_ascent: (entry, index) => {
      const name = entryName(entry);
      const chakra = formatSignal(entry.ch, "the central channel");
      return {
        nodeId: `${entry.sys}-${entry.e}-${index}`,
        nodeName: name,
        title: `Ascent ${index + 1}: ${name}`,
        subtitle: chakra,
        displayText: `${name} lifts the procession through ${chakra}. Body becomes psyche, psyche becomes image, image becomes a more spacious act of attention.`,
        guideText: `This part matters as a developmental step. Ask what the body needs before the mind turns it into a theory. Then ask what emotion is trying to become more conscious.`,
        narrationText: normalizeForSpeech(`${name} raises the current through ${chakra}. Start with sensation. Let the body become a doorway rather than a problem to solve.`),
        transitionReason: `Embodied ascent through ${chakra}`,
        quotaLine,
        entry,
      };
    },
    planetary_descent: (entry, index) => {
      const name = entryName(entry);
      const planet = formatSignal(entry.pl, "a descending planet");
      return {
        nodeId: `${entry.sys}-${entry.e}-${index}`,
        nodeName: name,
        title: `Descent ${index + 1}: ${name}`,
        subtitle: planet,
        displayText: `${name} receives pressure from ${planet}. The stream descends from idea into consequence, from omen into duty, from luminous pattern into the matter that must be handled.`,
        guideText: `This part matters when a symbol has to become real-world responsibility. What decision, boundary, promise, debt, or structure is asking for embodiment now?`,
        narrationText: normalizeForSpeech(`${name} descends under ${planet}. The image becomes consequence. Let the symbol show what must now be made practical.`),
        transitionReason: `Planetary pressure through ${planet}`,
        quotaLine,
        entry,
      };
    },
    elemental_transformation: (entry, index) => {
      const name = entryName(entry);
      const element = formatSignal(entry.el, "mixed element");
      const operation = formatSignal(entry.al, "transmutation");
      return {
        nodeId: `${entry.sys}-${entry.e}-${index}`,
        nodeName: name,
        title: `Operation ${index + 1}: ${name}`,
        subtitle: `${operation} · ${element}`,
        displayText: `${name} performs ${operation} through ${element}. The path breaks, softens, hardens, and refines until the old shape can no longer pretend to be final.`,
        guideText: `This part matters because change has stages. Ask whether you are being asked to break a pattern, soften a defense, harden a boundary, or refine a gift.`,
        narrationText: normalizeForSpeech(`${name} works through ${operation} and ${element}. This is transformation as sequence. Let the stage name what kind of change is actually happening.`),
        transitionReason: `${operation} carried by ${element}`,
        quotaLine,
        entry,
      };
    },
  };

  const nodes = path.map((entry, index) => nodeBuilders[mode](entry, index));

  return {
    streamTitle: `${modeTitle[mode]} from ${seedName}`,
    streamSubtitle: `${nodes.length} gates built from strongest linked correspondences`,
    displayIntro: `${seedName} opens the first gate. The stream does not dump the archive; it chooses a path from the most coherent bridges in the lattice.`,
    guideIntro: `Use this as a ritual route. Move one gate at a time. At each point, ask why this symbol follows the last one and what part of lived life it is trying to clarify.`,
    narrationIntro: normalizeForSpeech(`${seedName} opens the stream. We will move gate by gate, following the strongest symbolic bridges rather than collecting every possible association.`),
    nodes,
    closingLine: `The procession returns to ${seedName} changed by relation.`,
    quotaLine,
  };
}

export function findEntanglements(seed: CodexEntry, allEntries: CodexEntry[], limit = 16) {
  return allEntries
    .map((entry) => ({ entry, score: scoreLink(seed, entry) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function materializeOracleText(text: string, allEntries: CodexEntry[], limit = 6) {
  const lower = text.toLowerCase();
  return allEntries
    .filter((entry) => {
      const name = cleanDisplayValue(entry.e).toLowerCase();
      return name.length > 2 && lower.includes(name);
    })
    .slice(0, limit);
}
