import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { ALLIANCES_CACHE_TAG } from "~/lib/alliancesCache";
import { isCronAuthorized } from "~/lib/cronAuth";

// ESI lists ~3,650 open alliances; a run that touches more than this is not a
// diff, so refuse it rather than evict half the site.
const MAX_ALLIANCE_IDS = 5000;

const bodySchema = z.object({
  allianceIds: z
    .array(z.number().int().positive())
    .max(MAX_ALLIANCE_IDS)
    .default([]),
});

/**
 * Evicts what the hourly `esi-update-alliances` job found changed. Called by
 * the `revalidate-alliance-cache` background job with the IDs of alliances
 * that were added, changed, closed, or gained or lost a member corporation.
 *
 * - Each `/alliance/[allianceId]` page is **expired** (`revalidatePath`), so
 *   the next request renders it afresh: its cached title and social card carry
 *   the alliance's name, ticker and executor, and serving those stale once more
 *   is what this route exists to stop. That render reads ESI, not our
 *   database, so expiring it cannot turn a database outage into an error page.
 * - The `/alliances` list is marked stale (`"max"`): the next visitor still
 *   gets the old copy while a fresh one renders, because that page reads the
 *   database and an outage must not replace it with an error page.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Expected { allianceIds: number[] }" },
      { status: 400 },
    );
  }

  const allianceIds = [...new Set(parsed.data.allianceIds)];
  for (const allianceId of allianceIds) {
    revalidatePath(`/alliance/${allianceId}`);
  }
  revalidateTag(ALLIANCES_CACHE_TAG, "max");

  return Response.json({ revalidated: allianceIds.length });
}
