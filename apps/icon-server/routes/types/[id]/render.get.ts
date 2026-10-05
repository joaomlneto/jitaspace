import { createError, defineEventHandler, getRouterParam } from "h3";

import { resolveResPath } from "../../../lib/resfile";
import { resolveRenderFileByTypeId } from "../../../lib/sde";
import { fetchImage, setImageHeaders } from "../../../lib/serve";
import { parseSize, resizeToJpeg } from "../../../lib/size";

/**
 * GET /types/{id}/render
 *
 * 3D render of a type (ships, structures, drones, …), served from the resfile —
 * no image-server proxy needed. The chain is:
 *
 *   typeId → graphicID (SDE /universe/types)
 *          → graphic.iconFolder (SDE /universe/graphics)
 *          → {iconFolder}/{graphicID}_512.jpg   (the 512px master)
 *
 * Matches `images.evetech.net/types/{id}/render`: JPEG, default 512px, with the
 * master resized for other `?size=` values. Returns 404 for types with no
 * render (e.g. modules — those have a flat `/icon` instead).
 *
 * A trailing extension on the ID is tolerated (`/types/587/render.jpg`).
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

  const renderFile = await resolveRenderFileByTypeId(typeId);
  if (!renderFile) {
    throw createError({
      statusCode: 404,
      statusMessage: `No render for type ${typeId} — it may not exist or have no graphic (e.g. modules use /icon)`,
    });
  }

  const cdnUrl = await resolveResPath(renderFile);
  if (!cdnUrl) {
    throw createError({
      statusCode: 404,
      statusMessage: `Render for type ${typeId} (${renderFile}) is not present in the current EVE build`,
    });
  }

  const { body } = await fetchImage(cdnUrl, renderFile);

  // The master is already 512px JPEG; resize only for other sizes.
  const size = parseSize(event);
  if (size === null || size === 512) {
    setImageHeaders(event, body.byteLength, "image/jpeg");
    return body;
  }

  const resized = await resizeToJpeg(body, size);
  setImageHeaders(event, resized.byteLength, "image/jpeg");
  return resized;
});
