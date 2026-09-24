import { describe, expect, it } from "@jest/globals";

import {
  corporationNameFromLpStoreSegment,
  lpStorePath,
  lpStoreSegment,
} from "~/lib/lpStorePath";

describe("lpStorePath", () => {
  // Every name the live `/lp-store` index linked on 2026-09-24 that carries
  // more than letters and spaces — each must keep the exact URL it has today.
  it.each([
    ["State Protectorate", "/lp-store/State_Protectorate"],
    ["Mordu's Legion", "/lp-store/Mordu's_Legion"],
    ["Eifyr and Co.", "/lp-store/Eifyr_and_Co."],
    ["Kor-Azor Family", "/lp-store/Kor-Azor_Family"],
    ["Zero-G Research Firm", "/lp-store/Zero-G_Research_Firm"],
  ])("keeps %p at %p", (name, path) => {
    expect(lpStorePath(name)).toBe(path);
  });

  it("encodes characters that would split or truncate the path", () => {
    expect(lpStoreSegment("A&B / Co #1?")).toBe("A%26B_%2F_Co_%231%3F");
  });

  // Next hands the page the decoded segment, so decode before reversing.
  it.each(["State Protectorate", "Mordu's Legion", "A&B / Co #1?"])(
    "round-trips %p through the URL",
    (name) => {
      const segment = decodeURIComponent(lpStoreSegment(name));
      expect(corporationNameFromLpStoreSegment(segment)).toBe(name);
    },
  );
});
