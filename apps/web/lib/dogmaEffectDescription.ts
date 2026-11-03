/** CCP's placeholder description on effects nobody wrote one for. */
export const BOILERPLATE_EFFECT_DESCRIPTION = "Automatically generated effect";

export interface ResolvedEffectDescription {
  text: string;
  /** "ccp": CCP's own text; "ai": our AI-generated `customDescription`. */
  source: "ccp" | "ai";
}

/**
 * The description to show for a dogma effect. CCP's own text wins; our
 * AI-generated `customDescription` only fills the gap where CCP left nothing,
 * or only its "Automatically generated effect" placeholder.
 */
export function resolveEffectDescription(
  description: string | null | undefined,
  customDescription: string | null | undefined,
): ResolvedEffectDescription | null {
  const official = description?.trim();
  if (official && official !== BOILERPLATE_EFFECT_DESCRIPTION) {
    return { text: official, source: "ccp" };
  }
  const custom = customDescription?.trim();
  if (custom) return { text: custom, source: "ai" };
  return null;
}
