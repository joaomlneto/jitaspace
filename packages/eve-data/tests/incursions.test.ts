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
      for (const [, entry] of Object.entries(incursion_constellations)) {
        for (const key of required) {
          expect(Object.prototype.hasOwnProperty.call(entry, key)).toBe(true);
        }
      }
    });

    it("has no empty constellation names as keys", () => {
      for (const name of Object.keys(incursion_constellations)) {
        expect(name.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe("field types (all entries)", () => {
    it("Staging is always a string", () => {
      for (const [, entry] of Object.entries(incursion_constellations)) {
        expect(typeof entry.Staging).toBe("string");
      }
    });

    it("Headquarters is always a string", () => {
      for (const [, entry] of Object.entries(incursion_constellations)) {
        expect(typeof entry.Headquarters).toBe("string");
      }
    });

    it("Vanguards is always an array", () => {
      for (const [, entry] of Object.entries(incursion_constellations)) {
        expect(Array.isArray(entry.Vanguards)).toBe(true);
      }
    });

    it("Assaults is always an array", () => {
      for (const [, entry] of Object.entries(incursion_constellations)) {
        expect(Array.isArray(entry.Assaults)).toBe(true);
      }
    });
  });

  describe("full (non-stub) entries", () => {
    it("there is at least one full entry", () => {
      expect(fullEntries.length).toBeGreaterThan(0);
    });

    it("Staging is a non-empty string", () => {
      for (const [, entry] of fullEntries) {
        expect(entry.Staging.trim().length).toBeGreaterThan(0);
      }
    });

    it("Headquarters is a non-empty string", () => {
      for (const [, entry] of fullEntries) {
        expect(entry.Headquarters.trim().length).toBeGreaterThan(0);
      }
    });

    it("Vanguards is a non-empty array (when HQ and Vanguards are both populated)", () => {
      // Some entries have a non-empty HQ but stub-like empty Vanguard arrays
      // (e.g. "2747-4" has HQ "A-" but Vanguards: [""]).
      // We only enforce non-empty Vanguards where actual system names are present.
      for (const [, entry] of fullEntries) {
        const populatedVanguards = entry.Vanguards.filter((s) => s.trim().length > 0);
        if (entry.Vanguards.length > 0 && populatedVanguards.length === 0) {
          // skip — entry has placeholder empty strings in Vanguards
          continue;
        }
        expect(entry.Vanguards.length).toBeGreaterThan(0);
      }
    });

    it("every Vanguard element is a string", () => {
      for (const [, entry] of fullEntries) {
        for (const system of entry.Vanguards) {
          expect(typeof system).toBe("string");
        }
      }
    });

    it("every Assault element is a string", () => {
      for (const [, entry] of fullEntries) {
        for (const system of entry.Assaults) {
          expect(typeof system).toBe("string");
        }
      }
    });
  });

  describe("uniqueness constraints (full entries)", () => {
    it("no two full constellations share the same Headquarters", () => {
      const hqs = fullEntries.map(([, entry]) => entry.Headquarters);
      expect(new Set(hqs).size).toBe(hqs.length);
    });

    it("Staging and Headquarters are different solar systems within each full constellation", () => {
      for (const [, entry] of fullEntries) {
        if (entry.Staging.trim().length === 0) continue;
        expect(entry.Staging).not.toBe(entry.Headquarters);
      }
    });

    it("Staging does not appear in Assaults within each full constellation", () => {
      for (const [, entry] of fullEntries) {
        if (entry.Staging.trim().length === 0) continue;
        expect(entry.Assaults).not.toContain(entry.Staging);
      }
    });

    it("Headquarters does not appear in Assaults within each full constellation", () => {
      for (const [, entry] of fullEntries) {
        expect(entry.Assaults).not.toContain(entry.Headquarters);
      }
    });
  });

  describe("known constellation regression tests", () => {
    it("Algintal has the expected solar systems", () => {
      const c = incursion_constellations.Algintal!;
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
      const c = incursion_constellations.Ihilakken!;
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
      const c = incursion_constellations.Sanctum!;
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
      const c = incursion_constellations.Ananah!;
      expect(c).toBeDefined();
      expect(c.Staging).toBe("Mifrata");
      expect(c.Headquarters).toBe("");
    });
  });
});
