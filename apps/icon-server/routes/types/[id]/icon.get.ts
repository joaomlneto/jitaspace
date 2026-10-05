import { createError, defineEventHandler, getQuery, getRouterParam } from "h3";

import { compositeBadge } from "../../../lib/compose";
import { resolveResPath } from "../../../lib/resfile";
import {
  resolveBadgeIconFileByTypeId,
  resolveIconFileByTypeId,
  resolveRenderIconFileByTypeId,
  resolveSkinIconFileByTypeId,
} from "../../../lib/sde";
import { fetchImage, serveFromCdn, setImageHeaders } from "../../../lib/serve";
import { parseSize, resizeToPng } from "../../../lib/size";

/**
 * GET /types/{id}/icon
 *
 * Flat icon image for an EVE type, served from CCP's resource CDN
 * (resources.eveonline.com). The chain is:
 *
 *   typeId → iconId (SDE /universe/types)
 *         → iconFile (SDE /universe/icons)
 *         → CDN URL (resfile index)
 *         → image bytes
 *
 * For meta-group items (Tech II, faction, officer, …) the SDE icon is the *bare*
 * icon; the official image server bakes a coloured tier badge into the corner.
 * We reproduce that by compositing the metaGroup's overlay on top, so the output
 * matches `images.evetech.net/types/{id}/icon`. Pass `?badge=0` (also `false` /
 * `none` / `off`) to get the bare icon without the overlay.
 *
 * Types with no `iconID` fall back, in order, to: a SKIN's material icon, then
 * the 64px render icon (ships/structures/… — what the image server serves as
 * their `/icon`). The tier badge applies only to flat icons; SKIN and render
 * icons are served as-is. Returns 404 only when none of those resolve.
 *
 * A trailing extension on the ID is tolerated (`/types/587/icon.png`).
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

  // Ships, structures, drones, … (and the Capsule) — the official /icon is the
  // 64px render icon. Prefer it whenever that asset exists; this naturally
  // excludes blueprints and charge graphics, which have no pre-rendered icon, so
  // those fall through to their flat icon below.
  const renderIconFile = await resolveRenderIconFileByTypeId(typeId);
  if (renderIconFile !== null) {
    const renderIconUrl = await resolveResPath(renderIconFile);
    if (renderIconUrl !== null) {
      return serveFromCdn(event, renderIconUrl, renderIconFile);
    }
  }

  // Flat icon, or — for SKINs — the material icon. Only a *flat* icon is eligible
  // for the meta-group badge below.
  const flatIconFile = await resolveIconFileByTypeId(typeId);
  const iconFile = flatIconFile ?? (await resolveSkinIconFileByTypeId(typeId));
  if (!iconFile) {
    throw createError({
      statusCode: 404,
      statusMessage: `No icon for type ${typeId} — the type may not exist or may have no icon`,
    });
  }

  const cdnUrl = await resolveResPath(iconFile);
  if (!cdnUrl) {
    throw createError({
      statusCode: 404,
      statusMessage: `Icon for type ${typeId} (${iconFile}) is not present in the current EVE build`,
    });
  }

  // Meta-group tier badge (Tech II "II", faction/officer/… corner) — flat icons
  // only (SKIN and render icons carry none). Opt out with ?badge=0.
  const badgeValue: unknown = getQuery(event).badge;
  const badgeOptOut =
    typeof badgeValue === "string" &&
    ["0", "false", "none", "off"].includes(badgeValue.toLowerCase());
  const badgeFile =
    flatIconFile !== null && !badgeOptOut
      ? await resolveBadgeIconFileByTypeId(typeId)
      : null;
  const badgeUrl = badgeFile ? await resolveResPath(badgeFile) : null;

  // No badge (Tech I, no metaGroup, or the overlay is absent from this build):
  // serve the bare icon bytes unchanged.
  if (!badgeUrl) {
    return serveFromCdn(event, cdnUrl, iconFile);
  }

  // Composite the badge onto the icon. If anything fails (fetch/decode/Sharp),
  // fall back to the bare icon rather than failing the whole request.
  try {
    const [base, badge] = await Promise.all([
      fetchImage(cdnUrl, iconFile),
      fetchImage(badgeUrl, badgeFile ?? undefined),
    ]);
    const composited = await compositeBadge(base.body, badge.body);
    const size = parseSize(event);
    const out =
      size === null ? composited : await resizeToPng(composited, size);
    setImageHeaders(event, out.byteLength, "image/png");
    return out;
  } catch {
    return serveFromCdn(event, cdnUrl, iconFile);
  }
});
