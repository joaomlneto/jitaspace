import { createError, defineEventHandler, getRouterParam } from "h3";

import { resolveResPath } from "../../lib/resfile";
import { resolveIconFileById } from "../../lib/sde";
import { serveFromCdn } from "../../lib/serve";

/**
 * GET /icons/{iconId}
 *
 * Resolves an EVE icon ID → `res:/…` file (via the SDE) → CDN URL (via the
 * resfile index), then streams the image bytes from CCP's CDN.
 *
 * A trailing extension is tolerated, so `/icons/22` and `/icons/22.png` are
 * equivalent.
 */
export default defineEventHandler(async (event) => {
  const raw = (getRouterParam(event, "iconId") ?? "").replace(
    /\.[a-z0-9]+$/i,
    "",
  );
  const iconId = Number(raw);
  if (!Number.isInteger(iconId) || iconId < 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid icon ID: ${raw || "(empty)"}`,
    });
  }

  const iconFile = await resolveIconFileById(iconId);
  if (!iconFile) {
    throw createError({
      statusCode: 404,
      statusMessage: `No icon with ID ${iconId}`,
    });
  }

  const cdnUrl = await resolveResPath(iconFile);
  if (!cdnUrl) {
    throw createError({
      statusCode: 404,
      statusMessage: `Icon ${iconId} (${iconFile}) is not present in the current EVE build`,
    });
  }

  return serveFromCdn(event, cdnUrl, iconFile);
});
