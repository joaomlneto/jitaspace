import { createError } from "h3";

import { getPrisma } from "./db";

/**
 * SDE lookups, answered from the JitaSpace database (`@jitaspace/db`), which the
 * SDE ingest keeps in sync with CCP's Static Data Export.
 *
 * Every lookup is memoised per process — including misses (`null`) — since the
 * SDE only changes with an EVE build and the same few thousand IDs are asked
 * for over and over. Soft-deleted rows (`isDeleted`) are treated as missing:
 * they are no longer in the current SDE.
 *
 * Database problems surface as a 503 (never cached — see `error.ts`) rather
 * than an unhandled 500, and are logged with their cause.
 */

/**
 * Without `DATABASE_URL`, Prisma's pg adapter silently falls back to
 * `127.0.0.1:5432` and every lookup fails with a misleading "can't reach
 * database server" error — so check for it up front and say what's wrong.
 */
const DATABASE_URL_MISSING = !process.env.DATABASE_URL;
let warnedMissingDatabaseUrl = false;

function databaseUnavailable(reason: string, cause?: unknown): Error {
  return createError({
    statusCode: 503,
    statusMessage: "SDE database unavailable",
    message: `SDE database unavailable: ${reason}`,
    cause,
  });
}

/**
 * Memoise an async lookup by numeric key, caching misses too. Failures are not
 * cached (the next request retries) and are rethrown as a 503.
 */
function memoize<T>(
  lookup: (id: number) => Promise<T>,
): (id: number) => Promise<T> {
  const cache = new Map<number, Promise<T>>();
  return (id) => {
    if (DATABASE_URL_MISSING) {
      if (!warnedMissingDatabaseUrl) {
        warnedMissingDatabaseUrl = true;
        console.error(
          "[sde] DATABASE_URL is not set — SDE lookups (icons, types, …) will fail with 503 until it is configured.",
        );
      }
      return Promise.reject(databaseUnavailable("DATABASE_URL is not set"));
    }

    let pending = cache.get(id);
    if (pending === undefined) {
      pending = lookup(id).catch((error: unknown) => {
        cache.delete(id);
        console.error(`[sde] database lookup failed (id ${id}):`, error);
        throw databaseUnavailable("lookup failed", error);
      });
      cache.set(id, pending);
    }
    return pending;
  };
}

// ─── icon ID → iconFile ────────────────────────────────────────────────────

/**
 * Look up the `res:/…` file path for an EVE icon ID via the SDE.
 * Returns `null` if no icon with that ID exists.
 */
export const resolveIconFileById = memoize(
  async (iconId: number): Promise<string | null> => {
    const icon = await getPrisma().icon.findUnique({
      where: { iconId, isDeleted: false },
      select: { iconFile: true },
    });
    return icon?.iconFile ?? null;
  },
);

// ─── type ID → icon + meta-group ───────────────────────────────────────────

/** The SDE fields we keep per type. */
interface TypeInfo {
  iconID: number | null;
  metaGroupID: number | null;
  graphicID: number | null;
  /** The graphic's render-asset folder (`res:/…`), if the type has one. */
  graphicIconFolder: string | null;
  categoryID: number;
}

/** Fetch (and cache) the SDE record for a type. `null` means it doesn't exist. */
const fetchTypeInfo = memoize(
  async (typeId: number): Promise<TypeInfo | null> => {
    const type = await getPrisma().type.findUnique({
      where: { typeId, isDeleted: false },
      select: {
        iconId: true,
        metaGroupId: true,
        graphicId: true,
        graphic: { select: { iconFolder: true, isDeleted: true } },
        group: { select: { categoryId: true } },
      },
    });
    if (type === null) return null;
    return {
      iconID: type.iconId,
      metaGroupID: type.metaGroupId,
      graphicID: type.graphicId,
      graphicIconFolder:
        type.graphic && !type.graphic.isDeleted
          ? type.graphic.iconFolder
          : null,
      categoryID: type.group.categoryId,
    };
  },
);

/**
 * Resolve the `res:/…` icon file for an EVE type ID via the SDE.
 *
 * Chains typeId → iconId → iconFile.
 * Returns `null` when the type doesn't exist or has no flat icon (ships have no
 * iconID in the SDE — they only have a 3D render).
 */
export async function resolveIconFileByTypeId(
  typeId: number,
): Promise<string | null> {
  const info = await fetchTypeInfo(typeId);
  if (info === null) return null;
  if (info.iconID === null) return null;
  return resolveIconFileById(info.iconID);
}

// ─── meta-group → tier badge ───────────────────────────────────────────────

/**
 * The icon ID of a meta-group's corner badge — the small overlay CCP's client
 * (and images.evetech.net) stamps onto an item's icon to mark its tier: Tech
 * II's "II", the faction / officer / deadspace / … coloured corners, etc.
 * Returns `null` for any metaGroup that carries no overlay.
 */
const resolveMetaGroupBadgeIconId = memoize(
  async (metaGroupId: number): Promise<number | null> => {
    const metaGroup = await getPrisma().metaGroup.findUnique({
      where: { metaGroupId, isDeleted: false },
      select: { iconId: true },
    });
    return metaGroup?.iconId ?? null;
  },
);

/**
 * Resolve the `res:/…` file for a type's meta-group tier badge, or `null` when
 * the type carries no badge: no metaGroup (e.g. minerals), Tech I (metaGroupID
 * 1, which has no overlay), or a metaGroup whose overlay is missing.
 */
export async function resolveBadgeIconFileByTypeId(
  typeId: number,
): Promise<string | null> {
  const info = await fetchTypeInfo(typeId);
  if (info === null) return null;
  // No metaGroup (e.g. minerals) and Tech I (metaGroupID 1) carry no badge.
  if (info.metaGroupID === null || info.metaGroupID === 1) return null;

  const badgeIconId = await resolveMetaGroupBadgeIconId(info.metaGroupID);
  if (badgeIconId === null) return null;
  return resolveIconFileById(badgeIconId);
}

// ─── SKIN type → material icon ─────────────────────────────────────────────

/** SKIN license typeId → skinMaterialId; `null` if not a SKIN (or no material). */
const resolveSkinMaterialId = memoize(
  async (licenseTypeId: number): Promise<number | null> => {
    const license = await getPrisma().skinLicense.findUnique({
      where: { licenseTypeId, isDeleted: false },
      select: { skin: { select: { skinMaterialId: true, isDeleted: true } } },
    });
    if (!license || license.skin.isDeleted) return null;
    return license.skin.skinMaterialId;
  },
);

/**
 * Resolve the `res:/…` icon file for a SKIN type. SKINs carry no `iconID` in the
 * SDE — their icon is a pre-rendered overlay keyed by the skin's *material*:
 *
 *   typeId → skinId (SDE skinLicenses)
 *          → skinMaterialId (SDE skins)
 *          → res:/ui/texture/classes/skins/icons/{skinMaterialId}.png
 *
 * Returns `null` when the type is not a SKIN (or has no material icon). The
 * official image server returns 404 for SKINs, so this is JitaSpace-only.
 */
export async function resolveSkinIconFileByTypeId(
  typeId: number,
): Promise<string | null> {
  const skinMaterialId = await resolveSkinMaterialId(typeId);
  if (skinMaterialId === null) return null;

  return `res:/ui/texture/classes/skins/icons/${skinMaterialId}.png`;
}

// ─── group → category (blueprint detection) ────────────────────────────────

/** The SDE category ID for blueprints; blueprint types carry `bp` / `bpc`. */
const BLUEPRINT_CATEGORY_ID = 9;

/** Whether a type is a blueprint (SDE category 9) — i.e. has `bp` / `bpc`. */
export async function isBlueprintType(typeId: number): Promise<boolean> {
  const info = await fetchTypeInfo(typeId);
  if (info === null) return false;
  return info.categoryID === BLUEPRINT_CATEGORY_ID;
}

// ─── graphic → render ──────────────────────────────────────────────────────

/**
 * The render-asset folder + graphic ID for a type, or `null` if it has no
 * graphic. Ships/structures/drones/… have a `graphicID` (not an `iconID`) whose
 * graphic points to a folder of pre-rendered images, named `{graphicID}_{size}`.
 */
async function resolveRenderInfo(
  typeId: number,
): Promise<{ folder: string; graphicId: number } | null> {
  const info = await fetchTypeInfo(typeId);
  if (info === null) return null;
  if (info.graphicID === null || info.graphicIconFolder === null) return null;
  // Blueprints carry the *product's* graphicID, but the image server serves no
  // icon/render for them — only bp/bpc. Don't mistake that for a render.
  if (info.categoryID === BLUEPRINT_CATEGORY_ID) return null;

  return { folder: info.graphicIconFolder, graphicId: info.graphicID };
}

/**
 * The `res:/…` file for a type's 3D render — the 512px master that the image
 * server resizes for `/render`. `null` when the type has no render.
 */
export async function resolveRenderFileByTypeId(
  typeId: number,
): Promise<string | null> {
  const render = await resolveRenderInfo(typeId);
  if (render === null) return null;
  return `${render.folder}/${render.graphicId}_512.jpg`;
}

/**
 * The `res:/…` file for a type's 64px render icon — what the image server serves
 * as the `/icon` for ships and other render-only types (which have no flat
 * icon). `null` when the type has no render.
 */
export async function resolveRenderIconFileByTypeId(
  typeId: number,
): Promise<string | null> {
  const render = await resolveRenderInfo(typeId);
  if (render === null) return null;
  return `${render.folder}/${render.graphicId}_64.png`;
}
