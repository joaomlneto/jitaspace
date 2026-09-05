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

describe("type/[typeId] generateMetadata og:image", () => {
  beforeEach(() => {
    jest.resetModules();
    typeFindUniqueOrThrow.mockReset();
    typeFindUniqueOrThrow.mockResolvedValue({
      typeId: 34,
      name: "Tritanium",
      description: "The most common ore type in the known world.",
    });
  });

  it("prefers the icon variation when the image service offers one", async () => {
    mockImageService(["icon", "bp"]);
    const meta = await metadataFor(34);
    expect(meta.openGraph?.images?.[0]?.url).toBe(
      "https://images.evetech.net/types/34/icon",
    );
    expect(meta.twitter?.images?.[0]).toBe(
      "https://images.evetech.net/types/34/icon",
    );
  });

  it("falls back to the first variation when there is no icon", async () => {
    mockImageService(["render"]);
    const meta = await metadataFor(34);
    expect(meta.openGraph?.images?.[0]?.url).toBe(
      "https://images.evetech.net/types/34/render",
    );
  });

  // The regression: /types/2 404s, so the variation list is empty and the
  // variation is undefined. Interpolating it shipped
  // `https://images.evetech.net/types/2/undefined` as og:image and
  // twitter:image on every image-less type page — all of which are in the
  // sitemap. Guessing a variation is no better: /types/2/icon 404s too.
  it("emits no image at all when the image service has none", async () => {
    mockImageService("not-found");
    const meta = await metadataFor(2);
    expect(meta.openGraph?.images).toEqual([]);
    expect(meta.twitter?.images).toEqual([]);
  });

  it("never emits a URL containing 'undefined'", async () => {
    for (const variations of [
      "not-found" as const,
      [] as string[],
      ["icon"],
      ["render"],
    ]) {
      mockImageService(variations);
      const meta = await metadataFor(2);
      const urls = [
        ...(meta.openGraph?.images ?? []).map((i) => i.url),
        ...(meta.twitter?.images ?? []),
      ];
      for (const url of urls) expect(url).not.toContain("undefined");
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
