import { describe, expect, it } from "@jest/globals";

import { resolveEffectDescription } from "~/lib/dogmaEffectDescription";

describe("resolveEffectDescription", () => {
  it("prefers CCP's own description", () => {
    expect(
      resolveEffectDescription("Requires a low power slot", "Ours."),
    ).toEqual({ text: "Requires a low power slot", source: "ccp" });
  });

  it("uses ours where CCP left nothing or its placeholder", () => {
    expect(resolveEffectDescription(null, "Ours.")).toEqual({
      text: "Ours.",
      source: "ai",
    });
    expect(resolveEffectDescription("  ", "Ours.")).toEqual({
      text: "Ours.",
      source: "ai",
    });
    expect(
      resolveEffectDescription("Automatically generated effect", " Ours. "),
    ).toEqual({ text: "Ours.", source: "ai" });
  });

  it("returns null when there is neither", () => {
    expect(resolveEffectDescription(null, null)).toBeNull();
    expect(
      resolveEffectDescription("Automatically generated effect", "  "),
    ).toBeNull();
  });
});
