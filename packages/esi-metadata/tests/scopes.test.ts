import { getScopeDescription, scopeDescriptions, scopes } from "../src/scopes";

// ESI names scopes in two conventions. The original is
// `esi-{domain}.{action}.v{N}` (e.g. esi-skills.read_skills.v1). Compatibility
// date 2026-08-18 introduced a second, `esi.{domain}.{subject}:{action}` (e.g.
// esi.cosmetic.char:read, used by the SKINR and military-campaigns endpoints).
// Both are live, so a scope is well-formed if it matches either.
const LEGACY_SCOPE_PATTERN = /^esi-[a-z_]+\.[a-z_]+\.v\d+$/;
const MODERN_SCOPE_PATTERN = /^esi\.[a-z_]+\.[a-z_]+:[a-z_]+$/;
const SCOPE_PATTERN = new RegExp(
  `${LEGACY_SCOPE_PATTERN.source}|${MODERN_SCOPE_PATTERN.source}`,
);

describe("scopes array", () => {
  it("is non-empty", () => {
    expect(scopes.length).toBeGreaterThan(0);
  });

  it("has no duplicate entries", () => {
    const unique = new Set(scopes);
    expect(unique.size).toBe(scopes.length);
  });

  it("every scope matches one of the two ESI scope naming patterns", () => {
    for (const scope of scopes) {
      expect(scope).toMatch(SCOPE_PATTERN);
    }
  });
});

describe("scopeDescriptions", () => {
  // scopeDescriptions is a hand-curated overlay, not generated: it may omit
  // scopes (the generator warns about those — a nag, not a failure). The hard
  // invariants are that it contains no stale keys and no empty values.

  it("all description values are non-empty strings", () => {
    for (const value of Object.values(scopeDescriptions)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("every key is a scope the spec still lists (no orphans)", () => {
    const scopeSet = new Set<string>(scopes);
    for (const key of Object.keys(scopeDescriptions)) {
      expect(scopeSet.has(key)).toBe(true);
    }
  });

  it("all description keys match the ESI scope naming pattern", () => {
    for (const key of Object.keys(scopeDescriptions)) {
      expect(key).toMatch(SCOPE_PATTERN);
    }
  });

  it("contains a known scope description spot-check (esi-wallet.read_character_wallet.v1)", () => {
    expect(scopeDescriptions["esi-wallet.read_character_wallet.v1"]).toContain(
      "wallet",
    );
  });

  it("contains a known scope description spot-check (esi-location.read_location.v1)", () => {
    expect(scopeDescriptions["esi-location.read_location.v1"]).toContain(
      "location",
    );
  });

  it("contains a known scope description spot-check (esi-skills.read_skills.v1)", () => {
    expect(scopeDescriptions["esi-skills.read_skills.v1"]).toContain("skills");
  });
});

describe("getScopeDescription", () => {
  it("returns the curated description for a described scope", () => {
    expect(getScopeDescription("esi-skills.read_skills.v1")).toContain(
      "skills",
    );
  });

  it("falls back to the scope string for an undescribed scope", () => {
    // A scope CCP may add before a curated description is written — the
    // forgiving ESIScope type accepts it, and the lookup degrades gracefully.
    const futureScope = "esi-some.future_scope.v9";
    expect(getScopeDescription(futureScope)).toBe(futureScope);
  });
});
