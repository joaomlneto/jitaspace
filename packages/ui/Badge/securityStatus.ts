/**
 * EVE Online solar-system security-status helpers.
 *
 * The canonical CCP colour ramp runs from deep blue (1.0 high-sec) through
 * yellow (0.5), red (0.1) and finally purple for null-sec (<= 0.0). These
 * helpers are the single source of truth for that ramp so the security badge
 * and any richer displays (hero panels, maps, ...) stay consistent.
 */

/** Null-sec purple — also the fallback for any out-of-range value. */
const NULL_SEC_COLOR = "#813861";

/** Background colour for each rounded security tier. */
const SECURITY_STATUS_COLORS: Record<string, string> = {
  "1.0": "#4072D9",
  "0.9": "#5597E3",
  "0.8": "#72C9F2",
  "0.7": "#81D7A7",
  "0.6": "#8FE269",
  "0.5": "#F5FD93",
  "0.4": "#CC722C",
  "0.3": "#BE4E26",
  "0.2": "#AB2923",
  "0.1": "#692623",
  "0.0": NULL_SEC_COLOR,
};

/** Rounded tiers whose bright backgrounds need dark text for contrast. */
const LIGHT_SECURITY_TIERS = new Set(["0.5", "0.6", "0.7", "0.8"]);

/**
 * Round a raw security status to its displayed tier (one decimal, clamped at
 * 0.0 — EVE never shows a negative security number with a distinct colour).
 */
export const roundSecurityStatus = (securityStatus: number): number =>
  Math.round(Math.max(securityStatus, 0) * 10) / 10;

/** Displayed security value, e.g. `0.9`, `0.0`. */
export const formatSecurityStatus = (securityStatus: number): string =>
  roundSecurityStatus(securityStatus).toFixed(1);

/** Hex background colour for a security status. */
export const securityStatusColor = (securityStatus: number): string =>
  SECURITY_STATUS_COLORS[formatSecurityStatus(securityStatus)] ?? NULL_SEC_COLOR;

/** Whether a tier's background is bright enough to require dark text. */
export const isLightSecurityStatus = (securityStatus: number): boolean =>
  LIGHT_SECURITY_TIERS.has(formatSecurityStatus(securityStatus));

export type SecurityBand = "High-Sec" | "Low-Sec" | "Null-Sec";

/**
 * Coarse security band a system belongs to. High-sec is any status that rounds
 * to >= 0.5, low-sec is any positive status below that, everything else (0.0
 * and below, including wormhole space) is null-sec.
 */
export const securityStatusBand = (securityStatus: number): SecurityBand => {
  if (Math.round(securityStatus * 10) / 10 >= 0.5) return "High-Sec";
  if (securityStatus > 0) return "Low-Sec";
  return "Null-Sec";
};
