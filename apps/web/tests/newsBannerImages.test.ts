import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@jest/globals";

import { PATCH_NOTES_BANNER_IMAGE } from "~/components/PatchNotes/patchNotesItem";
import { newsItems } from "~/config/news";

const PUBLIC = join(__dirname, "..", "public");

// NewsBannerCard paints its image as a CSS background, so next/image never
// optimises it: whatever file is named here is downloaded as-is by every visitor
// to the home page. The card is at most ~520 CSS px wide, so 4K key art (~500 KB)
// is pure waste.
const BANNER_BUDGET_BYTES = 100 * 1024;

const bannerImages = [
  ...newsItems.flatMap((item) => (item.image ? [item.image] : [])),
  PATCH_NOTES_BANNER_IMAGE,
].filter((image) => image.startsWith("/"));

describe("news banner images", () => {
  it("covers the curated items and the patch-notes card", () => {
    expect(bannerImages).toContain(PATCH_NOTES_BANNER_IMAGE);
    expect(bannerImages.length).toBeGreaterThan(1);
  });

  it.each(bannerImages)("%s exists and is within the size budget", (image) => {
    const file = join(PUBLIC, image);
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).size).toBeLessThan(BANNER_BUDGET_BYTES);
  });
});
