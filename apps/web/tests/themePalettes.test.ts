import { describe, expect, it } from "@jest/globals";

import { themes } from "~/themes";

// Colours pages ask for by name (e.g. the system page's `eve_primary` flags,
// the dogma pages' `eve_accent` badges, the type page's `eve.2` values). A
// theme without them renders those as invalid CSS: a filled badge loses its
// fill and keeps its white text. (Minimal is Mantine's own, without them.)
const NAMED = ["eve", "eve_primary", "eve_accent"];

describe.each(
  Object.keys(themes).filter(
    (name) => name !== "minimal",
  ) as (keyof typeof themes)[],
)("the %s theme", (name) => {
  it.each(NAMED)("defines the %s palette", (color) => {
    expect(themes[name].colors?.[color]).toHaveLength(10);
  });
});
