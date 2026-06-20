import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  addIdToItem,
  fixObjectIndices,
  fromArrayOfObjectsToMap,
  loadFile,
  sdeInputFiles
  
} from "../../src/sources/sde";
import type {SdeSourceFile} from "../../src/sources/sde";

describe("fromArrayOfObjectsToMap", () => {
  it("indexes an array of objects by the id attribute", () => {
    const data = [
      { typeID: 34, name: "Tritanium" },
      { typeID: 35, name: "Pyerite" },
    ];
    const result = fromArrayOfObjectsToMap(data, {
      idAttributeName: "typeID",
    } as SdeSourceFile);
    expect(result).toEqual({
      34: { typeID: 34, name: "Tritanium" },
      35: { typeID: 35, name: "Pyerite" },
    });
  });

  it("returns an empty map for an empty array", () => {
    expect(
      fromArrayOfObjectsToMap([], { idAttributeName: "typeID" } as SdeSourceFile),
    ).toEqual({});
  });

  it("throws when an item is missing the id attribute", () => {
    const data = [{ name: "no-id-here" }];
    expect(() =>
      fromArrayOfObjectsToMap(data, {
        idAttributeName: "typeID",
      } as SdeSourceFile),
    ).toThrow("Missing ID typeID");
  });

  it("warns but keeps the last value when duplicate ids are present", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const data = [
      { typeID: 1, name: "first" },
      { typeID: 1, name: "second" },
    ];
    const result = fromArrayOfObjectsToMap(data, {
      idAttributeName: "typeID",
    } as SdeSourceFile);
    expect(result[1]).toEqual({ typeID: 1, name: "second" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Duplicate ID 1"));
    warn.mockRestore();
  });
});

describe("addIdToItem", () => {
  it("injects a numeric id derived from the object key", () => {
    const data = {
      34: { name: "Tritanium" },
      35: { name: "Pyerite" },
    };
    const result = addIdToItem(data, {
      idAttributeName: "typeID",
      idAttributeType: "number",
    } as SdeSourceFile);
    expect(result[34]).toEqual({ name: "Tritanium", typeID: 34 });
    expect(typeof (result[34] as Record<string, unknown>).typeID).toBe("number");
  });

  it("injects a string id when idAttributeType is string", () => {
    const data = { en: { label: "English" } };
    const result = addIdToItem(data, {
      idAttributeName: "languageID",
      idAttributeType: "string",
    } as SdeSourceFile);
    expect(result.en).toEqual({ label: "English", languageID: "en" });
  });
});

describe("fixObjectIndices", () => {
  it("re-keys an object by each entry's id attribute", () => {
    // Values keyed by an arbitrary index, but each carries its real id.
    const data = {
      0: { regionID: 10000002, name: "The Forge" },
      1: { regionID: 10000043, name: "Domain" },
    };
    const result = fixObjectIndices(data, { idAttributeName: "regionID" });
    expect(Object.keys(result).sort()).toEqual(["10000002", "10000043"]);
    expect(result[10000002]).toEqual({ regionID: 10000002, name: "The Forge" });
  });
});

describe("sdeInputFiles registry", () => {
  it("every entry is well-formed", () => {
    for (const [filename, spec] of Object.entries(sdeInputFiles)) {
      expect(typeof spec.idAttributeName).toBe("string");
      expect(["string", "number"]).toContain(spec.idAttributeType);
      expect(Array.isArray(spec.transformations)).toBe(true);
      // sanity: filename keys look like yaml files
      expect(filename).toMatch(/\.yaml$/);
    }
  });

  it('"addId" entries are numeric and carry the addIdToItem transformation', () => {
    const types = sdeInputFiles["types.yaml"]!;
    expect(types.idAttributeType).toBe("number");
    expect(types.idAttributeName).toBe("typeID");
    expect(types.transformations).toContain(addIdToItem);
  });

  it('"noTransform" entries carry no transformations', () => {
    expect(sdeInputFiles["blueprints.yaml"]!.transformations).toHaveLength(0);
    expect(sdeInputFiles["translationLanguages.yaml"]!.idAttributeType).toBe(
      "string",
    );
  });
});

describe("loadFile", () => {
  let sdeRoot: string;

  beforeEach(() => {
    sdeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sde-loadfile-"));
  });

  afterEach(() => {
    fs.rmSync(sdeRoot, { recursive: true, force: true });
  });

  it("loads a YAML file and applies the addIdToItem transformation", () => {
    // races.yaml uses addId("raceID"): keyed object, ids injected as numbers.
    fs.writeFileSync(
      path.join(sdeRoot, "races.yaml"),
      ["1:", "  name: Caldari", "8:", "  name: Gallente", ""].join("\n"),
    );
    const result = loadFile("races.yaml", sdeRoot) as Record<
      number,
      Record<string, unknown>
    >;
    expect(result[1]).toEqual({ name: "Caldari", raceID: 1 });
    expect(result[8]).toEqual({ name: "Gallente", raceID: 8 });
  });

  it("loads a noTransform file unchanged", () => {
    fs.writeFileSync(
      path.join(sdeRoot, "blueprints.yaml"),
      ["681:", "  maxProductionLimit: 200", ""].join("\n"),
    );
    const result = loadFile("blueprints.yaml", sdeRoot) as Record<
      number,
      Record<string, unknown>
    >;
    expect(result[681]).toEqual({ maxProductionLimit: 200 });
  });

  it("throws for a filename not present in the registry", () => {
    expect(() =>
      loadFile("not-a-real-file.yaml", sdeRoot),
    ).toThrow("not found in sdeInputFiles");
  });
});
