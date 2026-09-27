/**
 * Builds page metadata so a pasted link unfurls as the thing it points at.
 *
 * WHY THIS EXISTS: Next merges metadata per-key across segments, and only
 * re-resolves `openGraph` for a segment that declares it. A page that sets just
 * `title`/`description` therefore inherits the root layout's `openGraph` intact
 * — so every such link used to unfurl on Discord as the generic "JitaSpace /
 * EVE Online companion app" card no matter what it pointed at. The inverse trap
 * is just as easy: a page that *does* declare `openGraph` replaces the root's
 * wholesale, silently dropping `siteName` and `type`.
 *
 * So the rule for this app is: every page states its OpenGraph block in full,
 * via this helper.
 */

import type { Metadata } from "next";
import { cacheLife } from "next/cache";

import type { OgFact } from "./og";
import { buildOgImageUrl, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from "./og";

export const SITE_NAME = "JitaSpace";

export interface PageMetadataInput {
  /** Page/entity name. The root layout's `%s | JitaSpace` template is applied. */
  title: string;
  /** Sentence shown under the title, in search results and in the unfurl. */
  description?: string;
  /** Canonical path, e.g. `/system/30000142`. Resolved against `metadataBase`. */
  path: string;
  /** Kind-of-thing label rendered as a chip on the card, e.g. "Solar System". */
  badge?: string;
  /** EVE CDN artwork for the card (portrait, logo, render). */
  image?: string;
  /** Up to three short `label`/`value` chips shown on the card. */
  facts?: OgFact[];
  /** `article` for changelog-style pages; defaults to `website`. */
  type?: "website" | "article";
}

/**
 * Assembles `title`, `description`, canonical URL, OpenGraph and Twitter tags
 * from one description of the page, with a generated card as the image.
 */
export function pageMetadata({
  title,
  description,
  path,
  badge,
  image,
  facts,
  type = "website",
}: PageMetadataInput): Metadata {
  const ogImage = buildOgImageUrl({
    title,
    subtitle: description,
    badge,
    image,
    facts,
  });

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: SITE_NAME,
      url: path,
      title,
      description,
      images: [
        {
          url: ogImage,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: title,
        },
      ],
    },
    twitter: {
      // The generated card is 1.91:1, so it fills the large card properly.
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

/** EVE CDN artwork URLs, sized for the card's 268px artwork slot. */
export const eveImage = {
  character: (id: number) =>
    `https://images.evetech.net/characters/${id}/portrait?size=512`,
  corporation: (id: number) =>
    `https://images.evetech.net/corporations/${id}/logo?size=256`,
  alliance: (id: number) =>
    `https://images.evetech.net/alliances/${id}/logo?size=128`,
  /**
   * `render` is a 3/4 view of the ship or structure and is what people expect
   * to see; only some types have one, so prefer `resolveTypeImage`, which asks
   * the CDN which variations exist.
   */
  type: (id: number, variation: "render" | "icon" | "bp" | "bpc" = "icon") =>
    `https://images.evetech.net/types/${id}/${variation}?size=512`,
};

/**
 * Asks the CDN which image variations a type publishes. Throws on anything but
 * a well-formed answer, so a transient failure is never stored as "this type
 * has no artwork" for the whole `cacheLife` window — only a genuine answer
 * (including an empty list) reaches the cache.
 */
export async function readTypeImageVariations(
  typeId: number,
): Promise<string[]> {
  "use cache";
  cacheLife("days");
  const res = await fetch(`https://images.evetech.net/types/${typeId}`, {
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) {
    throw new Error(
      `images.evetech.net answered ${res.status} for type ${typeId}`,
    );
  }
  const variations: unknown = await res.json();
  if (!Array.isArray(variations)) {
    throw new Error(`images.evetech.net sent a non-list for type ${typeId}`);
  }
  return variations.filter((v): v is string => typeof v === "string");
}

/**
 * Picks the best artwork a type actually has: the CDN 404s on a variation a
 * type doesn't publish (ships have renders, modules only icons), which would
 * leave an empty frame on the card.
 *
 * Deliberately uncached: the failure is caught here, outside the cache scope of
 * `readTypeImageVariations`, so a CDN blip degrades this one render to "no
 * image" without being remembered.
 */
export async function resolveTypeImage(
  typeId: number | null | undefined,
): Promise<string | undefined> {
  if (typeId == null || !Number.isSafeInteger(typeId) || typeId <= 0) {
    return undefined;
  }
  let variations: string[];
  try {
    variations = await readTypeImageVariations(typeId);
  } catch {
    return undefined;
  }
  if (variations.includes("render")) return eveImage.type(typeId, "render");
  if (variations.includes("icon")) return eveImage.type(typeId, "icon");
  return undefined;
}

/**
 * Prefixes "the" only when a name doesn't already carry it — many EVE regions
 * and constellations are named "The Forge", "The Citadel", "The Spire", which
 * would otherwise read "in the The Forge region".
 */
export function withArticle(name: string): string {
  return /^the\s/i.test(name) ? name : `the ${name}`;
}

/**
 * Strips EVE's HTML markup (descriptions are stored as in-game rich text) and
 * trims to a length that survives Discord/Twitter truncation intact.
 */
export function toDescription(
  html: string | null | undefined,
  fallback?: string,
): string | undefined {
  if (!html) return fallback;
  let out = "";
  let inTag = false;
  for (const ch of html) {
    if (ch === "<") inTag = true;
    else if (ch === ">") inTag = false;
    else if (!inTag) out += ch;
  }
  const text = out.replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  return text.length > 200 ? `${text.slice(0, 199).trimEnd()}…` : text;
}
