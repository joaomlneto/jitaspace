/**
 * Enforces that every server-component page.tsx either exports `metadata` or
 * `generateMetadata`.  Client components (those starting with "use client")
 * are skipped because they cannot export metadata from the same file.
 *
 * Pages that are auth-gated or intentionally excluded from search indexing are
 * listed in EXCLUDED_PAGES — add a comment explaining why when you add one.
 */

import { readdirSync, readFileSync } from "fs";
import { join, relative } from "path";
import { describe, expect, it } from "@jest/globals";

// ---------------------------------------------------------------------------
// Pages excluded from the metadata requirement
// ---------------------------------------------------------------------------
// These routes are auth-gated, private to the authenticated user, or internal
// tools — they should not appear in search results.
const EXCLUDED_PAGES = new Set([
  "app/calendar/[eventId]/page.tsx", // personal calendar event — auth required
  "app/contract/[contractId]/page.tsx", // personal/private contract — auth required
  "app/debug/page.tsx", // internal developer tool
  "app/mail/page.tsx", // personal mail — auth required
  "app/settings/page.tsx", // user settings — auth required
  "app/ship-scanner/page.tsx", // user feature — auth required
  "app/skills/page.tsx", // personal skill queue — auth required
  "app/structure/[structureId]/page.tsx", // player structures may require auth
  "app/travel/[[...waypoints]]/page.tsx", // personal travel planner — auth required
  "app/type/[typeId]/[tab]/page.tsx", // redirect-only route to /type/[typeId]?tab= — renders no content
]);

// ---------------------------------------------------------------------------
// File walker
// ---------------------------------------------------------------------------

function findPageFiles(dir: string, root: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findPageFiles(full, root));
    } else if (entry.name === "page.tsx" || entry.name === "page.ts") {
      results.push(relative(root, full));
    }
  }
  return results.sort();
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

describe("page metadata coverage", () => {
  const root = join(__dirname, "..");
  const appDir = join(root, "app");
  const pages = findPageFiles(appDir, root);

  it("every server-component page.tsx exports metadata or generateMetadata", () => {
    const missing: string[] = [];

    for (const page of pages) {
      if (EXCLUDED_PAGES.has(page)) continue;

      const src = readFileSync(join(root, page), "utf-8");

      // Client components cannot export metadata from the page file itself.
      if (src.trimStart().startsWith('"use client"')) continue;

      const hasMetadata =
        /\bexport\s+const\s+metadata\b/.test(src) ||
        /\bexport\s+(async\s+)?function\s+generateMetadata\b/.test(src);

      if (!hasMetadata) {
        missing.push(page);
      }
    }

    expect(missing).toEqual([]);
  });
});
