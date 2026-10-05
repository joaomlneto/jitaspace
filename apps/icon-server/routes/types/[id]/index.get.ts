import {
  createError,
  defineEventHandler,
  getRouterParam,
  setResponseHeader,
} from "h3";

import { resolveResPath } from "../../../lib/resfile";
import {
  isBlueprintType,
  resolveIconFileByTypeId,
  resolveRenderFileByTypeId,
  resolveRenderIconFileByTypeId,
  resolveSkinIconFileByTypeId,
} from "../../../lib/sde";
import { IMAGE_CACHE_CONTROL } from "../../../lib/serve";

/**
 * GET /types/{id}
 *
 * The image variations this service can serve for a type, as a JSON array —
 * mirroring `images.evetech.net/types/{id}`. We report what *we* serve:
 *
 *   - `icon` — a flat resfile icon, a SKIN's material icon, or a ship's render
 *     icon. Note we cover SKINs, which the official server has no variation for.
 *   - `render` — for ships/structures/… (from the resfile).
 *   - `bp` / `bpc` — for blueprints (proxied from the image server).
 *
 * Returns 404 when the type has no servable image.
 */
export default defineEventHandler(async (event) => {
  const raw = (getRouterParam(event, "id") ?? "").replace(/\.[a-z0-9]+$/i, "");
  const typeId = Number(raw);
  if (!Number.isInteger(typeId) || typeId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid type ID: ${raw || "(empty)"}`,
    });
  }

  const variations: string[] = [];

  // `icon`: a render icon (ships), a flat icon, or a SKIN material icon —
  // whichever resolves in this build, matching what /icon serves.
  const iconResolvers = [
    resolveRenderIconFileByTypeId,
    resolveIconFileByTypeId,
    resolveSkinIconFileByTypeId,
  ];
  for (const resolve of iconResolvers) {
    const file = await resolve(typeId);
    if (file !== null && (await resolveResPath(file)) !== null) {
      variations.push("icon");
      break;
    }
  }

  // `render`: ships, structures, drones, …
  const renderFile = await resolveRenderFileByTypeId(typeId);
  if (renderFile !== null && (await resolveResPath(renderFile)) !== null) {
    variations.push("render");
  }

  // `bp` / `bpc`: blueprints.
  if (await isBlueprintType(typeId)) {
    variations.push("bp", "bpc");
  }

  if (variations.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: `No image variations for type ${typeId}`,
    });
  }

  setResponseHeader(event, "Access-Control-Allow-Origin", "*");
  setResponseHeader(event, "Cache-Control", IMAGE_CACHE_CONTROL);
  return variations;
});
