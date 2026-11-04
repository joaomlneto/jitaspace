import { describe, expect, it } from "@jest/globals";

import {
  isLightSecurityStatus,
  securityStatusColor,
} from "../../Badge/securityStatus";

// --- WCAG 2.1 relative luminance / contrast ratio -------------------------
const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (a: string, b: string) => {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

// The darkest "black" and lightest "white" the app's themes use as text.
const DARK_TEXT = "#101010";
const LIGHT_TEXT = "#f1f1f1";

describe("isLightSecurityStatus", () => {
  // 1.0 is a near-tie (about 4.1:1 either way), left white on purpose.
  it.each([0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9])(
    "picks the text colour that contrasts more on %p",
    (securityStatus) => {
      const bg = securityStatusColor(securityStatus);
      const dark = contrast(bg, DARK_TEXT);
      const light = contrast(bg, LIGHT_TEXT);
      expect(isLightSecurityStatus(securityStatus)).toBe(dark > light);
    },
  );
});
