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

/** EVE CDN artwork is always requested at this size (see `eveImage.type`). */
const RAW_IMAGE_SIZE = 512;

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
  /**
   * Unfurl this artwork directly, square, instead of compositing the generated
   * `/api/og` card — how killboards (zKillboard, EVE-Kill) present a kill: the
   * ship's own render as a small thumbnail, with the story told by
   * title/description rather than overlaid card text. Falls back to the
   * generated card (using `image`/`badge`/`facts` above) when unset.
   */
  rawImage?: string;
  /**
   * Emit `og:title`/`twitter:title` as given, without the root layout's
   * `%s | JitaSpace` template. An unfurl already names the site (`og:site_name`
   * is the provider line above the title on Discord), so the suffix only repeats
   * it — killboards leave it off their kill cards. The document `<title>` keeps
   * the template either way, for browser tabs and search results.
   */
  plainSocialTitle?: boolean;
}

/**
 * Assembles `title`, `description`, canonical URL, OpenGraph and Twitter tags
 * from one description of the page, with a generated card — or, when
 * `rawImage` is given, that artwork directly — as the image.
 */
export function pageMetadata({
  title,
  description,
  path,
  badge,
  image,
  facts,
  type = "website",
  rawImage,
  plainSocialTitle = false,
}: PageMetadataInput): Metadata {
  const ogImage =
    rawImage ??
    buildOgImageUrl({
      title,
      subtitle: description,
      badge,
      image,
      facts,
    });
  const imageSize = rawImage
    ? { width: RAW_IMAGE_SIZE, height: RAW_IMAGE_SIZE }
    : { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT };
  const socialTitle = plainSocialTitle ? { absolute: title } : title;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: SITE_NAME,
      url: path,
      title: socialTitle,
      description,
      images: [
        {
          url: ogImage,
          ...imageSize,
          alt: title,
        },
      ],
    },
    twitter: {
      // The generated card is 1.91:1 and wants the large card; a raw square
      // thumbnail unfurls the way zKillboard/EVE-Kill declare their own kill
      // images — as "summary", not stretched into the large-image slot.
      card: rawImage ? "summary" : "summary_large_image",
      title: socialTitle,
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
 * (including an empty list, or a 404 for a type the CDN has never heard of)
 * reaches the cache.
 */
export async function readTypeImageVariations(
  typeId: number,
): Promise<string[]> {
  "use cache";
  cacheLife("days");
  const res = await fetch(`https://images.evetech.net/types/${typeId}`, {
    signal: AbortSignal.timeout(5_000),
  });
  // A 404 is the CDN's own answer that it has no artwork for this type at all
  // (production sees it for e.g. types 36364 and 48543), so it is cached like
  // an empty list. Throwing on it would re-ask the CDN on every render and log
  // each one as a runtime error.
  if (res.status === 404) return [];
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
 * EVE's rich text (descriptions are stored as in-game HTML) as plain text: tags
 * dropped, a line break kept as a space, and whitespace collapsed.
 */
export function stripEveMarkup(html: string): string {
  let out = "";
  let tag: string | null = null;
  for (const ch of html) {
    if (ch === "<") tag = "";
    else if (tag !== null && ch === ">") {
      // `a<br>b` must not run the two words together.
      if (/^br\b/i.test(tag)) out += " ";
      tag = null;
    } else if (tag !== null) tag += ch;
    else out += ch;
  }
  return out.replace(/\s+/g, " ").trim();
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
  const text = stripEveMarkup(html);
  if (!text) return fallback;
  return text.length > 200 ? `${text.slice(0, 199).trimEnd()}…` : text;
}
