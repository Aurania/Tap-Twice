/** Built-in pocket ids. Custom pockets use any other id string. */
export type BuiltInPocketId = "fashion" | "gadgets" | "entertainment" | "travel";

const BUILT_IN: Record<BuiltInPocketId, { color: string; ring: string }> = {
  fashion: { color: "var(--tt-color-pocket-fashion)", ring: "var(--tt-color-pocket-fashion-ring)" },
  gadgets: { color: "var(--tt-color-pocket-gadgets)", ring: "var(--tt-color-pocket-gadgets-ring)" },
  entertainment: { color: "var(--tt-color-pocket-entertainment)", ring: "var(--tt-color-pocket-entertainment-ring)" },
  travel: { color: "var(--tt-color-pocket-travel)", ring: "var(--tt-color-pocket-travel-ring)" },
};

const isBuiltIn = (id: string): id is BuiltInPocketId => id in BUILT_IN;

/**
 * CSS color for a pocket's dot and bar. Custom pockets fall back to the brand color.
 * TODO(design): custom pocket colors are not specified in the handoff.
 */
export function pocketColor(id: string): string {
  return isBuiltIn(id) ? BUILT_IN[id].color : "var(--tt-color-action-primary)";
}

/** CSS color for a pocket's segment on a ring. */
export function pocketRingColor(id: string): string {
  return isBuiltIn(id) ? BUILT_IN[id].ring : "var(--tt-color-action-primary)";
}
