import { createError, defineEventHandler, getRouterParam } from "h3";

import { proxyTypeVariation } from "../../../lib/imageserver";

/**
 * GET /types/{id}/bp
 *
 * Blueprint-original image for a type. Blueprints have no flat `icon` (the SDE
 * icon is the bare product icon); CCP's image server composes the blue
 * blueprint frame + product render at request time, which isn't stored in the
 * resfile — so we proxy it from images.evetech.net for exact parity.
 *
 * Returns 404 for types that have no blueprint image. Forwards a power-of-two
 * `?size=` (32–1024).
 */
export default defineEventHandler((event) => {
  const raw = (getRouterParam(event, "id") ?? "").replace(/\.[a-z0-9]+$/i, "");
  const typeId = Number(raw);
  if (!Number.isInteger(typeId) || typeId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid type ID: ${raw || "(empty)"}`,
    });
  }

  return proxyTypeVariation(event, typeId, "bp");
});
