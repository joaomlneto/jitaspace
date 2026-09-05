/**
 * Guards the regression from aa2e305c: `/types/2` 404s, so the variation list is
 * empty and the variation is `undefined`. Interpolating it shipped
 * `https://images.evetech.net/types/2/undefined` as og:image and twitter:image
 * on every image-less type page — all of which are in the sitemap.
 *
 * The og:image is now the generated card (`/api/og`) rather than a bare CDN
 * URL, so the artwork travels in that card's `image` query param and these
 * assertions follow it there. The invariant is unchanged and checked more
 * broadly than before: no URL the page emits may contain "undefined", query
 * string included.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

type Row = Record<string, unknown>;

const typeFindUniqueOrThrow = jest.fn<(args?: unknown) => Promise<Row>>();

jest.mock("~/lib/db", () => ({
  prisma: {
    type: { findUniqueOrThrow: (a?: unknown) => typeFindUniqueOrThrow(a) },
    typeAttribute: { findMany: () => Promise.resolve([]) },
  },
}));

// `getTypeData` is a "use cache" function; cacheLife is a no-op here.
jest.mock("next/cache", () => ({
  cacheLife: () => undefined,
  unstable_cacheLife: () => undefined,
}));

jest.mock("~/app/type/[typeId]/page.client", () => ({ default: () => null }));
jest.mock("~/components/PageSkeleton", () => ({ PageSkeleton: () => null }));

/** Stand in for images.evetech.net/types/<id>, which lists an item's renders. */
function mockImageService(variations: string[] | "not-found") {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      status: variations === "not-found" ? 404 : 200,
      json: () => Promise.resolve(variations === "not-found" ? [] : variations),
    }),
  ) as unknown as typeof fetch;
}

async function metadataFor(typeId: number | string) {
  const { generateMetadata } = require("~/app/type/[typeId]/page") as {
    generateMetadata: (a: {
      params: Promise<{ typeId: string }>;
    }) => Promise<Record<string, never>>;
  };
  return (await generateMetadata({
    params: Promise.resolve({ typeId: String(typeId) }),
  })) as {
    alternates?: { canonical?: string };
    openGraph?: { images?: { url: string }[] };
    twitter?: { images?: string[] };
  };
}

/** Every URL the page emits, card URLs and the artwork they embed alike. */
function emittedUrls(meta: {
  openGraph?: { images?: { url: string }[] };
  twitter?: { images?: string[] };
}): string[] {
  const cards = [
    ...(meta.openGraph?.images ?? []).map((image) => image.url),
    ...(meta.twitter?.images ?? []),
  ];
  const embedded = cards.flatMap((card) => {
    const image = new URL(card, "https://www.jita.space").searchParams.get(
      "image",
    );
    return image ? [image] : [];
  });
  return [...cards, ...embedded];
}

/** The artwork the card was told to draw, or undefined when it was given none. */
function cardArtwork(meta: {
  openGraph?: { images?: { url: string }[] };
}): string | undefined {
  const card = meta.openGraph?.images?.[0]?.url;
  if (!card) return undefined;
  return (
    new URL(card, "https://www.jita.space").searchParams.get("image") ??
    undefined
  );
}

describe("type/[typeId] generateMetadata og:image", () => {
  beforeEach(() => {
    jest.resetModules();
    typeFindUniqueOrThrow.mockReset();
    typeFindUniqueOrThrow.mockResolvedValue({
      typeId: 34,
      name: "Tritanium",
      description: "The most common ore type in the known world.",
      group: { name: "Mineral", category: { name: "Material" } },
    });
  });

  it("uses the icon variation when that is all the image service offers", async () => {
    mockImageService(["icon", "bp"]);
    expect(cardArtwork(await metadataFor(34))).toBe(
      "https://images.evetech.net/types/34/icon?size=512",
    );
  });

  it("prefers the render, which is what fills a 1200x630 card", async () => {
    mockImageService(["icon", "render"]);
    expect(cardArtwork(await metadataFor(34))).toBe(
      "https://images.evetech.net/types/34/render?size=512",
    );
  });

  it("falls back to the first variation when there is no icon", async () => {
    mockImageService(["bp"]);
    expect(cardArtwork(await metadataFor(34))).toBe(
      "https://images.evetech.net/types/34/bp?size=512",
    );
  });

  // The regression: guessing a variation is no better than interpolating an
  // undefined one — /types/2/icon 404s too. The card still renders, with the
  // type's name and group in place of artwork.
  it("draws a card with no artwork when the image service has none", async () => {
    mockImageService("not-found");
    const meta = await metadataFor(2);
    expect(meta.openGraph?.images?.[0]?.url).toBeDefined();
    expect(cardArtwork(meta)).toBeUndefined();
  });

  it("never emits a URL containing 'undefined'", async () => {
    for (const variations of [
      "not-found" as const,
      [] as string[],
      ["icon"],
      ["render"],
    ]) {
      mockImageService(variations);
      for (const url of emittedUrls(await metadataFor(2))) {
        expect(url).not.toContain("undefined");
      }
    }
  });
});

describe("type/[typeId] generateMetadata canonical", () => {
  beforeEach(() => {
    jest.resetModules();
    typeFindUniqueOrThrow.mockReset();
    typeFindUniqueOrThrow.mockResolvedValue({
      typeId: 587,
      name: "Rifter",
      description: "A frigate.",
      group: { name: "Frigate", category: { name: "Ship" } },
    });
    mockImageService(["icon"]);
  });

  it("points at the canonical spelling of the id, relative to metadataBase", async () => {
    expect((await metadataFor(587)).alternates?.canonical).toBe("/type/587");
  });

  // Measured on production 2026-09-02: /type/587, /type/0587 and /type/587.0
  // all returned 200 serving the Rifter. The duplicates now 404, and the guard
  // rejects them before the query so no cache entry is minted for them either.
  it.each(["0587", "587.0", "+587", "0"])(
    "returns no metadata for the non-canonical id %p",
    async (typeId) => {
      expect(await metadataFor(typeId)).toEqual({});
      expect(typeFindUniqueOrThrow).not.toHaveBeenCalled();
    },
  );
});
