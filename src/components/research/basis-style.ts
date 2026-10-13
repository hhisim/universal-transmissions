import type { ResearchConnection } from "@/lib/research-connections";

/**
 * The epistemic vocabulary, in one place.
 *
 * Both the room connections surface and the research nexus render the SAME scale, so
 * a label means exactly one thing wherever a visitor meets it. Defined once rather
 * than retyped per component.
 */
export const BASIS_STYLE: Record<
  ResearchConnection["basis"],
  { label: string; color: string; note: string }
> = {
  documented: {
    label: "Documented reference",
    color: "var(--ut-cyan)",
    note: "Named in an existing UT record or written about directly in the Journal.",
  },
  interpretation: {
    label: "UT interpretation",
    color: "var(--ut-magenta)",
    note: "A reading this project makes. Not a claim about how the world behaves.",
  },
  thematic: {
    label: "Thematic association",
    color: "var(--ut-gold)",
    note: "A shared subject or idea. Useful as context; not a sourced link.",
  },
};
