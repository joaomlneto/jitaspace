import { scopes, scopeDescriptions } from "../src/scopes";

const SCOPE_PATTERN = /^esi-[a-z_]+\.[a-z_]+\.v\d+$/;

describe("scopes array", () => {
  it("is non-empty", () => {
    expect(scopes.length).toBeGreaterThan(0);
  });

  it("has no duplicate entries", () => {
    const unique = new Set(scopes);
    expect(unique.size).toBe(scopes.length);
  });

  it("every scope matches the pattern esi-{domain}.{action}.v{N}", () => {
    for (const scope of scopes) {
      expect(scope).toMatch(SCOPE_PATTERN);
    }
  });
});

describe("scopeDescriptions", () => {
  it("has an entry for every scope in the scopes array", () => {
    for (const scope of scopes) {
      // Use `in` operator because toHaveProperty treats dots as path separators
      expect(scope in scopeDescriptions).toBe(true);
    }
  });

  it("all description values are non-empty strings", () => {
    for (const [key, value] of Object.entries(scopeDescriptions)) {
      expect(typeof value).toBe("string");
      expect((value as string).length).toBeGreaterThan(0);
    }
  });

  it("every key in scopeDescriptions is a valid scope", () => {
    const scopeSet = new Set<string>(scopes);
    for (const key of Object.keys(scopeDescriptions)) {
      expect(scopeSet.has(key)).toBe(true);
    }
  });

  it("has at least as many entries as the scopes array", () => {
    expect(Object.keys(scopeDescriptions).length).toBeGreaterThanOrEqual(
      scopes.length,
    );
  });

  it("covers all scopes (100% description coverage)", () => {
    const missingScopes = scopes.filter(
      (scope) => !(scope in scopeDescriptions),
    );
    expect(missingScopes).toEqual([]);
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

  it("all description keys match the ESI scope naming pattern", () => {
    for (const key of Object.keys(scopeDescriptions)) {
      expect(key).toMatch(SCOPE_PATTERN);
    }
  });
});
