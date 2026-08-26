import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@jest/globals";

import { CATEGORY_ROUTE_PREFIX } from "~/components/Spotlight/useSearchActions";

const APP_DIR = join(process.cwd(), "app");

/**
 * Every prefix in the table is followed by an entity id, so the destination is
 * always `<prefix><id>` — which requires a dynamic route segment underneath it.
 */
function hasDynamicRoute(prefix: string): boolean {
  const segment = prefix.replace(/^\/|\/$/g, "");
  const dir = join(APP_DIR, segment);
  if (!existsSync(dir)) return false;
  return readdirSync(dir, { withFileTypes: true }).some(
    (entry) => entry.isDirectory() && entry.name.startsWith("["),
  );
}

describe("Spotlight CATEGORY_ROUTE_PREFIX", () => {
  const entries = Object.entries(CATEGORY_ROUTE_PREFIX);

  it("is not empty", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  // The ESI category name and the app's path are not always the same word —
  // `solar_system` lives at /system/. Nothing in the type system catches that,
  // and the table shipped pointing at /solar_system/, so every solar-system
  // search result navigated to a 404.
  it.each(entries)(
    "%s -> %s resolves to a real dynamic route",
    (_category, prefix) => {
      expect(hasDynamicRoute(prefix)).toBe(true);
    },
  );

  it("uses a leading and trailing slash so `${prefix}${id}` is well formed", () => {
    for (const [, prefix] of entries) {
      expect(prefix.startsWith("/")).toBe(true);
      expect(prefix.endsWith("/")).toBe(true);
      expect(prefix).not.toContain("//");
    }
  });
});
