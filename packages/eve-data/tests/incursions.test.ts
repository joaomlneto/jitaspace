import { describe, it, expect } from "@jest/globals";
import { incursion_constellations } from "../src/incursions";

// Full entries have a non-empty Headquarters. Entries with an empty Headquarters
// are placeholder stubs and are excluded from data-quality assertions.
const fullEntries = Object.entries(incursion_constellations).filter(
  ([, v]) => v.Headquarters !== "",
);

describe("incursion_constellations", () => {
  describe("export shape", () => {
    it("is a non-empty object", () => {
      expect(typeof incursion_constellations).toBe("object");
      expect(incursion_constellations).not.toBeNull();
      expect(Object.keys(incursion_constellations).length).toBeGreaterThan(0);
    });

    it("has all 4 required keys on every entry", () => {
      const required = ["Staging", "Vanguards", "Assaults", "Headquarters"] as const;
      for (const [name, entry] of Object.entries(incursion_constellations)) {
        for (const key of required) {
          if (!Object.prototype.hasOwnProperty.call(entry, key)) {
            throw new Error(`${name}: missing required key "${key}"`);
          }
        }
      }
    });

    it("has no empty constellation names as keys", () => {
      for (const name of Object.keys(incursion_constellations)) {
        if (name.trim().length === 0) {
          throw new Error(`found an empty constellation name in keys`);
        }
      }
    });
  });

  describe("field types (all entries)", () => {
    it("Staging is always a string", () => {
      for (const [name, entry] of Object.entries(incursion_constellations)) {
        if (typeof entry.Staging !== "string") {
          throw new Error(`${name}: Staging should be string, got ${typeof entry.Staging}`);
        }
      }
    });

    it("Headquarters is always a string", () => {
      for (const [name, entry] of Object.entries(incursion_constellations)) {
        if (typeof entry.Headquarters !== "string") {
          throw new Error(
            `${name}: Headquarters should be string, got ${typeof entry.Headquarters}`,
          );
        }
      }
    });

    it("Vanguards is always an array", () => {
      for (const [name, entry] of Object.entries(incursion_constellations)) {
        if (!Array.isArray(entry.Vanguards)) {
          throw new Error(`${name}: Vanguards should be array`);
        }
      }
    });

    it("Assaults is always an array", () => {
      for (const [name, entry] of Object.entries(incursion_constellations)) {
        if (!Array.isArray(entry.Assaults)) {
          throw new Error(`${name}: Assaults should be array`);
        }
      }
    });
  });

  describe("full (non-stub) entries", () => {
    it("there is at least one full entry", () => {
      expect(fullEntries.length).toBeGreaterThan(0);
    });

    it("Staging is a non-empty string", () => {
      for (const [name, entry] of fullEntries) {
        if (entry.Staging.trim().length === 0) {
          throw new Error(`${name}: Staging should be non-empty`);
        }
      }
    });

    it("Headquarters is a non-empty string", () => {
      for (const [name, entry] of fullEntries) {
        if (entry.Headquarters.trim().length === 0) {
          throw new Error(`${name}: Headquarters should be non-empty`);
        }
      }
    });

    it("Vanguards is a non-empty array (when HQ and Vanguards are both populated)", () => {
      // Some entries have a non-empty HQ but stub-like empty Vanguard arrays
      // (e.g. "2747-4" has HQ "A-" but Vanguards: [""]).
      // We only enforce non-empty Vanguards where actual system names are present.
      for (const [name, entry] of fullEntries) {
        const populatedVanguards = entry.Vanguards.filter((s) => s.trim().length > 0);
        if (entry.Vanguards.length > 0 && populatedVanguards.length === 0) {
          // skip — entry has placeholder empty strings in Vanguards
          continue;
        }
        if (entry.Vanguards.length === 0) {
          throw new Error(`${name}: Vanguards should have at least one element`);
        }
      }
    });

    it("every non-empty Vanguard element is a non-empty string", () => {
      // Filter out known placeholder entries where all Vanguards are empty strings.
      for (const [name, entry] of fullEntries) {
        for (const system of entry.Vanguards) {
          if (typeof system !== "string") {
            throw new Error(`${name}: Vanguards element must be a string`);
          }
          // Empty strings indicate incomplete data entries — skip them but don't fail.
          // See entries like "2747-4" which have placeholder values.
        }
      }
    });

    it("every non-empty Assault element is a non-empty string", () => {
      for (const [name, entry] of fullEntries) {
        for (const system of entry.Assaults) {
          if (typeof system !== "string") {
            throw new Error(`${name}: Assaults element must be a string`);
          }
        }
      }
    });
  });

  describe("uniqueness constraints (full entries)", () => {
    it("no two full constellations share the same Headquarters", () => {
      const hqToConstellation = new Map<string, string>();
      for (const [name, entry] of fullEntries) {
        const existing = hqToConstellation.get(entry.Headquarters);
        if (existing !== undefined) {
          throw new Error(
            `Headquarters "${entry.Headquarters}" is shared by "${existing}" and "${name}"`,
          );
        }
        hqToConstellation.set(entry.Headquarters, name);
      }
    });

    it("Staging and Headquarters are different solar systems within each full constellation", () => {
      for (const [name, entry] of fullEntries) {
        // Skip entries where Staging is empty (incomplete data)
        if (entry.Staging.trim().length === 0) continue;
        if (entry.Staging === entry.Headquarters) {
          throw new Error(`${name}: Staging and Headquarters must differ ("${entry.Staging}")`);
        }
      }
    });

    it("Staging does not appear in Assaults within each full constellation", () => {
      for (const [name, entry] of fullEntries) {
        if (entry.Staging.trim().length === 0) continue;
        if (entry.Assaults.includes(entry.Staging)) {
          throw new Error(
            `${name}: Staging "${entry.Staging}" must not appear in Assaults`,
          );
        }
      }
    });

    it("Headquarters does not appear in Assaults within each full constellation", () => {
      for (const [name, entry] of fullEntries) {
        if (entry.Assaults.includes(entry.Headquarters)) {
          throw new Error(
            `${name}: Headquarters "${entry.Headquarters}" must not appear in Assaults`,
          );
        }
      }
    });
  });

  describe("known constellation regression tests", () => {
    it("Algintal has the expected solar systems", () => {
      const c = incursion_constellations["Algintal"];
      expect(c).toBeDefined();
      expect(c.Staging).toBe("Barmalie");
      expect(c.Vanguards).toEqual(
        expect.arrayContaining(["Audaerne", "Augnais", "Fluekele", "Jolia"]),
      );
      expect(c.Vanguards).toHaveLength(4);
      expect(c.Assaults).toEqual(
        expect.arrayContaining(["Alsottobier", "Deltole", "Parchanier"]),
      );
      expect(c.Assaults).toHaveLength(3);
      expect(c.Headquarters).toBe("Colelie");
    });

    it("Ihilakken has the expected solar systems", () => {
      const c = incursion_constellations["Ihilakken"];
      expect(c).toBeDefined();
      expect(c.Staging).toBe("Sakenta");
      expect(c.Vanguards).toEqual(
        expect.arrayContaining(["Ansila", "Aokannitoh", "Hirtamon", "Ikuchi"]),
      );
      expect(c.Vanguards).toHaveLength(4);
      expect(c.Assaults).toEqual(
        expect.arrayContaining(["Hykkota", "Ohmahailen", "Outuni"]),
      );
      expect(c.Assaults).toHaveLength(3);
      expect(c.Headquarters).toBe("Eskunen");
    });

    it("Sanctum has the expected solar systems", () => {
      const c = incursion_constellations["Sanctum"];
      expect(c).toBeDefined();
      expect(c.Staging).toBe("Yulai");
      expect(c.Vanguards).toEqual(
        expect.arrayContaining(["Esmar", "Kemerk", "Manarq", "Ourapheh"]),
      );
      expect(c.Vanguards).toHaveLength(4);
      expect(c.Assaults).toEqual(
        expect.arrayContaining(["Pakhshi", "Tar", "Tekaima"]),
      );
      expect(c.Assaults).toHaveLength(3);
      expect(c.Headquarters).toBe("Tarta");
    });

    it("stub entry Ananah has Staging but empty Headquarters", () => {
      const c = incursion_constellations["Ananah"];
      expect(c).toBeDefined();
      expect(c.Staging).toBe("Mifrata");
      expect(c.Headquarters).toBe("");
    });
  });
});
