/**
 * Shared contract for the generated OpenGraph card (`/api/og`).
 *
 * Both sides of the contract live here so they can't drift: `buildOgImageUrl`
 * (called from `generateMetadata`, see `lib/metadata.ts`) writes the query
 * string, and `parseOgImageParams` (called from the route handler) reads it
 * back. The route is a public endpoint — anyone can request arbitrary text — so
 * parsing is where the untrusted input gets clamped and the remote image host
 * gets allow-listed.
 */

/** Facebook/Discord/Twitter all render 1.91:1 cards; 1200x630 is the standard. */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/**
 * Hosts a card is allowed to embed artwork from. Without this the endpoint
 * would happily proxy any URL on the internet into an image served from our own
 * domain. Kept in sync with `img-src` in `next.config.mjs`.
 */
const ALLOWED_IMAGE_HOSTS = new Set([
  "images.evetech.net",
  "icons.jita.space",
  "web.ccpgamescdn.com",
]);

/**
 * Separates a fact's label from its value inside a single `fact` query param.
 * Labels are our own constants and never contain it; values are entity data and
 * might, so the reader splits on the FIRST occurrence only.
 */
const FACT_SEPARATOR = "|";

// Satori lays the card out at a fixed size, so text has to be bounded rather
// than allowed to overflow. These limits are generous enough for real EVE names
// and descriptions while keeping a crafted URL from blowing up the layout.
const MAX_TITLE = 80;
const MAX_SUBTITLE = 160;
const MAX_BADGE = 32;
const MAX_FACTS = 3;
const MAX_FACT = 48;

export interface OgFact {
  label: string;
  value: string;
}

export interface OgCardParams {
  /** Entity name — the headline of the card. */
  title: string;
  /** One line of prose under the title (typically the page description). */
  subtitle?: string;
  /** Short kind-of-thing label, e.g. "Solar System" or "Corporation". */
  badge?: string;
  /** Absolute URL of the entity's artwork; must be on an allow-listed host. */
  image?: string;
  /** Up to three `label`/`value` chips, e.g. `{ label: "Region", value: "The Forge" }`. */
  facts?: OgFact[];
}

/** Collapses whitespace and truncates, so a card never renders a ragged blob. */
function clamp(value: string | undefined, max: number): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  return normalized.length > max
    ? `${normalized.slice(0, max - 1).trimEnd()}…`
    : normalized;
}

function isAllowedImage(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && ALLOWED_IMAGE_HOSTS.has(parsed.host);
  } catch {
    return false;
  }
}

/**
 * Builds the relative `/api/og` URL for a card. Relative is deliberate: Next
 * resolves it against `metadataBase` (set in the root layout) when it writes
 * the `og:image` tag, so this works on preview deployments and localhost too.
 */
export function buildOgImageUrl(params: OgCardParams): string {
  const search = new URLSearchParams();

  const title = clamp(params.title, MAX_TITLE);
  if (title) search.set("title", title);

  const subtitle = clamp(params.subtitle, MAX_SUBTITLE);
  if (subtitle) search.set("subtitle", subtitle);

  const badge = clamp(params.badge, MAX_BADGE);
  if (badge) search.set("badge", badge);

  if (isAllowedImage(params.image)) search.set("image", params.image);

  for (const fact of (params.facts ?? []).slice(0, MAX_FACTS)) {
    const label = clamp(fact.label, MAX_FACT);
    const value = clamp(fact.value, MAX_FACT);
    if (label && value) {
      search.append("fact", `${label}${FACT_SEPARATOR}${value}`);
    }
  }

  return `/api/og?${search.toString()}`;
}

/** Reads back what `buildOgImageUrl` wrote, re-clamping the untrusted input. */
export function parseOgImageParams(
  searchParams: URLSearchParams,
): OgCardParams {
  const facts: OgFact[] = [];
  for (const raw of searchParams.getAll("fact").slice(0, MAX_FACTS)) {
    const separatorAt = raw.indexOf(FACT_SEPARATOR);
    if (separatorAt < 0) continue;
    const label = clamp(raw.slice(0, separatorAt), MAX_FACT);
    const value = clamp(raw.slice(separatorAt + 1), MAX_FACT);
    if (label && value) facts.push({ label, value });
  }

  const image = searchParams.get("image") ?? undefined;

  return {
    title: clamp(searchParams.get("title") ?? undefined, MAX_TITLE) ?? "",
    subtitle: clamp(searchParams.get("subtitle") ?? undefined, MAX_SUBTITLE),
    badge: clamp(searchParams.get("badge") ?? undefined, MAX_BADGE),
    image: isAllowedImage(image) ? image : undefined,
    facts,
  };
}
