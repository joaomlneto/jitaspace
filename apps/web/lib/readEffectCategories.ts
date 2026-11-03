import type { EffectCategories } from "~/lib/dogmaEffectCategory";
import { prisma } from "~/lib/db";
import { toEffectCategory } from "~/lib/dogmaEffectCategory";

/**
 * Every dogma effect category, keyed by id, for pages that list many effects:
 * they send each effect's category id plus this map, not a copy per effect.
 *
 * No cache scope of its own: it runs inside the caller's. `customName` and
 * `customDescription` are ours (scripts/describe-dogma-effect-categories.ts),
 * not the SDE ingest's, so a caller keeps a daily `cacheLife` with the SDE tag
 * rather than `cacheSdeRead()`.
 */
export async function readEffectCategories(): Promise<EffectCategories> {
  const rows = await prisma.dogmaEffectCategory.findMany({
    select: {
      effectCategoryId: true,
      name: true,
      customName: true,
      customDescription: true,
    },
    where: { isDeleted: false },
  });
  const categories: EffectCategories = {};
  for (const row of rows) {
    const category = toEffectCategory(row.effectCategoryId, row);
    if (category) categories[row.effectCategoryId] = category;
  }
  return categories;
}
