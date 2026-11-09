/**
 * The colour each work actually is.
 *
 * Measured offline from the published master (median-cut over a 200px sample, choosing the
 * most chromatic cluster inside the visible range), then lifted to a glow value that reads
 * against the void. The gallery uses this to answer the artwork: the entrance, each plate's
 * halo and the viewer's field are keyed to the work in front of you rather than to a fixed
 * house accent.
 */

export type Spectrum = { accent: string; glow: string };

export const ARTWORK_SPECTRUM: Record<string, Spectrum> = {
  "root-chakra": { accent: "#e6bfcb", glow: "#cb4d73" },
  "sacral-chakra": { accent: "#e3b5bb", glow: "#cb4d5d" },
  "solar-plexus-chakra": { accent: "#cf9ea3", glow: "#cb4d5a" },
  "heart-chakra": { accent: "#dcbdbe", glow: "#cb4d51" },
  "throat-chakra": { accent: "#e3cbce", glow: "#cb4d5c" },
  "third-eye-chakra": { accent: "#e5c0be", glow: "#cb534d" },
  "crown-chakra": { accent: "#d9b9c5", glow: "#cb4d7c" },
  "tetragrammaton": { accent: "#e8b7b6", glow: "#cb4f4d" },
  "tesseract": { accent: "#e1b8c5", glow: "#cb4d75" },
  "merkaba": { accent: "#7a2e6d", glow: "#cb4db5" },
  "tetra": { accent: "#873b72", glow: "#cb4da8" },
  "higher-access": { accent: "#351d27", glow: "#cb4d81" },
  "vehicular-dynamics": { accent: "#f0c2b8", glow: "#d65c41" },
  "external-womb": { accent: "#e2acbb", glow: "#cb4d70" },
  "recursive-pantheism": { accent: "#6f425e", glow: "#cb4d9b" },
  "cosmic-egg": { accent: "#612e45", glow: "#cb4d86" },
  "vortex-dynamics": { accent: "#a88594", glow: "#cb4d83" },
  "vitruvian-spirit": { accent: "#e0bdc0", glow: "#cb4d57" },
  "prismatic-equation": { accent: "#891f59", glow: "#d44393" },
  "trinary-transcendence": { accent: "#6d234e", glow: "#cb4d96" },
  "hyperdimensional-harmonics": { accent: "#9a1c5a", glow: "#db3c8a" },
  "translinguistic-equation": { accent: "#773f79", glow: "#c74dcb" },
  "immaculate-conception": { accent: "#e0bfbe", glow: "#cb504d" },
  "twilight-pantheism": { accent: "#b5b477", glow: "#cbc94d" },
  "caelestis-lupus": { accent: "#f0c6bc", glow: "#d55f43" },
  "enchanted-essence": { accent: "#461d36", glow: "#cb4d9a" },
  "ethera-24": { accent: "#e3bcc1", glow: "#cb4d5d" },
  "frequency-tuner": { accent: "#6d2b62", glow: "#cb4db6" },
  "reversible-ratio": { accent: "#744b65", glow: "#cb4d9d" },
  "torroidal-tantra": { accent: "#e9d0c5", glow: "#cb734d" },
  "trivium-method": { accent: "#edbdb9", glow: "#d05248" },
  "linguistic-mystic": { accent: "#e6c0c2", glow: "#cb4d53" },
  "polarity-modulation": { accent: "#d7abb5", glow: "#cb4d69" },
  "indras-net": { accent: "#6c2f50", glow: "#cb4d91" },
  "innerstellar-telemetry": { accent: "#62205a", glow: "#cb4dbc" },
};

export function spectrumFor(slug: string): Spectrum {
  return ARTWORK_SPECTRUM[slug] ?? { accent: "#7a6f8f", glow: "#cb4db5" };
}

