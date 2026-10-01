/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";

import {
  DEFAULT_SHIP_TREE_FACTION_SLUG,
  getShipTreeFaction,
  getShipTreeFactionBySlug,
  isShipTreeFactionSlug,
  SHIP_TREE_FACTION_SLUGS,
  SHIP_TREE_FACTIONS,
} from "../factions";
import { readShipTreeDataFile } from "../server";

describe("SHIP_TREE_FACTIONS", () => {
  it("covers all seventeen factions the library draws", () => {
    expect(SHIP_TREE_FACTIONS).toHaveLength(17);
  });

  it("has unique ids, slugs and names", () => {
    for (const key of ["id", "slug", "name"] as const) {
      expect(new Set(SHIP_TREE_FACTIONS.map((f) => f[key])).size).toBe(17);
    }
  });

  it("uses slugs that are safe to put in a URL", () => {
    for (const { slug } of SHIP_TREE_FACTIONS) {
      expect(slug).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
    }
  });

  it("leads with the four empires, as the in-game picker does", () => {
    expect(SHIP_TREE_FACTIONS.slice(0, 4).map((f) => f.slug)).toEqual([
      "caldari",
      "minmatar",
      "amarr",
      "gallente",
    ]);
  });

  // Checks our ids against the library's own data rather than a copy of them.
  it("only lists factions present in the library's shipTreeFactions table", async () => {
    const table = (await readShipTreeDataFile("shipTreeFactions.jsonl")) ?? "";
    const idsInData = table
      .split("\n")
      .filter((line) => line !== "")
      .map((line) => (JSON.parse(line) as { _key: number })._key);

    const numerically = (a: number, b: number) => a - b;
    expect([...idsInData].sort(numerically)).toEqual(
      SHIP_TREE_FACTIONS.map((f) => f.id as number).sort(numerically),
    );
  });
});

describe("SHIP_TREE_FACTION_SLUGS", () => {
  it("is the slugs in picker order", () => {
    expect(SHIP_TREE_FACTION_SLUGS).toEqual(
      SHIP_TREE_FACTIONS.map((faction) => faction.slug),
    );
  });

  it("contains the default", () => {
    expect(SHIP_TREE_FACTION_SLUGS).toContain(DEFAULT_SHIP_TREE_FACTION_SLUG);
  });
});

describe("lookups", () => {
  it("finds a faction by id and by slug", () => {
    expect(getShipTreeFaction(500003)).toEqual({
      id: 500003,
      slug: "amarr",
      name: "Amarr Empire",
    });
    expect(getShipTreeFactionBySlug("amarr")).toBe(getShipTreeFaction(500003));
  });

  it("round-trips every faction through both lookups", () => {
    for (const faction of SHIP_TREE_FACTIONS) {
      expect(getShipTreeFaction(faction.id)).toBe(faction);
      expect(getShipTreeFactionBySlug(faction.slug)).toBe(faction);
    }
  });

  it("throws for an id or slug it does not know", () => {
    expect(() => getShipTreeFaction(1 as never)).toThrow(
      "Unknown ship tree faction 1",
    );
    expect(() => getShipTreeFactionBySlug("nope" as never)).toThrow(
      'Unknown ship tree faction "nope"',
    );
  });

  it("narrows strings to slugs", () => {
    expect(isShipTreeFactionSlug("amarr")).toBe(true);
    expect(isShipTreeFactionSlug("Amarr")).toBe(false);
    expect(isShipTreeFactionSlug("")).toBe(false);
    expect(isShipTreeFactionSlug("toString")).toBe(false);
  });
});
