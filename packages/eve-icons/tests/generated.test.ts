import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@jest/globals";

import type { Manifest } from "../scripts/manifest";
import { LEGACY_NAMES } from "../scripts/sets";
import * as icons from "../src";

const manifest = JSON.parse(
  readFileSync(join(__dirname, "..", "manifest.json"), "utf8"),
) as Manifest;

const exported = icons as unknown as Record<
  string,
  { icon?: { id: string; sources: { width: number }[] } } | undefined
>;

describe("generated icons", () => {
  it("exports one component per manifest icon", () => {
    expect(icons.EVE_ICONS).toHaveLength(manifest.icons.length);
    for (const meta of icons.EVE_ICONS) {
      const component = exported[meta.component];
      expect(component?.icon?.id).toBe(meta.id);
      expect(component?.icon?.sources.map((source) => source.width)).toEqual(
        meta.sizes,
      );
    }
  });

  it("keeps every legacy name pointing at its replacement", () => {
    for (const [alias, id] of Object.entries(LEGACY_NAMES)) {
      expect(exported[alias]?.icon?.id).toBe(id);
    }
  });

  it("records the build the icons came from", () => {
    expect(icons.EVE_ICONS_BUILD).toBe(manifest.build);
  });

  it("lists sizes smallest first", () => {
    for (const icon of manifest.icons) {
      const widths = icon.files.map((file) => file.width);
      expect(widths).toEqual([...widths].sort((a, b) => a - b));
    }
  });
});
