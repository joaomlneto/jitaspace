/**
 * `pageMetadata` is the single place every public page describes itself.
 *
 * The regression it exists to prevent: Next only re-resolves `openGraph` for a
 * segment that declares it, so a page setting just `title`/`description` used
 * to inherit the root layout's card and unfurl on Discord as the generic
 * "JitaSpace" blurb regardless of where it pointed.
 */

import { describe, expect, it, jest } from "@jest/globals";

import {
  eveImage,
  pageMetadata,
  resolveTypeImage,
  toDescription,
  withArticle,
} from "~/lib/metadata";
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from "~/lib/og";

jest.mock("next/cache", () => ({ cacheLife: jest.fn() }));

describe("pageMetadata", () => {
  const meta = pageMetadata({
    title: "Jita",
    description: "The busiest trade hub in New Eden.",
    path: "/system/30000142",
    badge: "Solar System",
    facts: [{ label: "Security", value: "0.9" }],
  });

  it("states the page's own title and description at the top level", () => {
    expect(meta.title).toBe("Jita");
    expect(meta.description).toBe("The busiest trade hub in New Eden.");
  });

  it("repeats them inside openGraph rather than inheriting the site default", () => {
    expect(meta.openGraph?.title).toBe("Jita");
    expect(meta.openGraph?.description).toBe(
      "The busiest trade hub in New Eden.",
    );
  });

  it("keeps siteName and type, which declaring openGraph would otherwise drop", () => {
    expect(meta.openGraph?.siteName).toBe("JitaSpace");
    expect(meta.openGraph).toHaveProperty("type", "website");
  });

  it("sets the canonical URL and og:url to the page's own path", () => {
    expect(meta.alternates?.canonical).toBe("/system/30000142");
    expect(meta.openGraph?.url).toBe("/system/30000142");
  });

  it("points og:image at a card carrying this page's own content", () => {
    const images = meta.openGraph?.images as {
      url: string;
      width: number;
      height: number;
      alt: string;
    }[];
    expect(images).toHaveLength(1);

    const image = images[0]!;
    expect(image.width).toBe(OG_IMAGE_WIDTH);
    expect(image.height).toBe(OG_IMAGE_HEIGHT);
    expect(image.alt).toBe("Jita");

    const query = new URL(image.url, "https://www.jita.space").searchParams;
    expect(query.get("title")).toBe("Jita");
    expect(query.get("badge")).toBe("Solar System");
    expect(query.getAll("fact")).toEqual(["Security|0.9"]);
  });

  it("uses the large Twitter card, since the generated card is 1.91:1", () => {
    expect(meta.twitter).toHaveProperty("card", "summary_large_image");
    expect(meta.twitter?.title).toBe("Jita");
  });

  it("marks article pages as such", () => {
    const article = pageMetadata({
      title: "Changelog",
      path: "/changelog",
      type: "article",
    });
    expect(article.openGraph).toHaveProperty("type", "article");
  });
});

describe("toDescription", () => {
  it("strips EVE's in-game HTML markup", () => {
    expect(toDescription("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("collapses the newlines EVE descriptions are full of", () => {
    expect(toDescription("Line one.\n\n  Line two.")).toBe(
      "Line one. Line two.",
    );
  });

  it("truncates to a length that survives unfurl truncation", () => {
    const result = toDescription("x".repeat(400));
    expect(result).toHaveLength(200);
    expect(result?.endsWith("…")).toBe(true);
  });

  it("falls back when the source is empty, null, or markup-only", () => {
    expect(toDescription(null, "fallback")).toBe("fallback");
    expect(toDescription("", "fallback")).toBe("fallback");
    expect(toDescription("<br/>", "fallback")).toBe("fallback");
  });

  it("returns undefined with no fallback to offer", () => {
    expect(toDescription(null)).toBeUndefined();
  });
});

describe("withArticle", () => {
  it("adds the article to a bare name", () => {
    expect(withArticle("Domain")).toBe("the Domain");
  });

  it("leaves a name that already carries one, so it never reads 'the The Forge'", () => {
    expect(withArticle("The Forge")).toBe("The Forge");
    expect(withArticle("the Citadel")).toBe("the Citadel");
  });
});

describe("eveImage", () => {
  it("requests portraits and logos large enough to fill the card's frame", () => {
    expect(eveImage.character(90000001)).toContain("size=512");
    expect(eveImage.corporation(98000001)).toContain("size=256");
    expect(eveImage.alliance(99005338)).toContain("size=128");
  });

  it("builds URLs on the allow-listed EVE image host", () => {
    for (const url of [
      eveImage.character(1),
      eveImage.corporation(1),
      eveImage.alliance(1),
      eveImage.type(587, "render"),
    ]) {
      expect(new URL(url).host).toBe("images.evetech.net");
    }
  });
});

describe("resolveTypeImage", () => {
  /** Stand in for images.evetech.net/types/<id>, which lists what a type has. */
  function mockImageService(variations: string[] | "unavailable") {
    global.fetch = jest.fn(() =>
      variations === "unavailable"
        ? Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve([]),
          })
        : Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(variations),
          }),
    ) as unknown as typeof fetch;
  }

  it("prefers the render, which is what fills the card's artwork frame", async () => {
    mockImageService(["icon", "render"]);
    expect(await resolveTypeImage(587)).toBe(
      "https://images.evetech.net/types/587/render?size=512",
    );
  });

  it("falls back to the icon when the type publishes no render", async () => {
    mockImageService(["icon"]);
    expect(await resolveTypeImage(34)).toBe(
      "https://images.evetech.net/types/34/icon?size=512",
    );
  });

  it("returns nothing when the type has no artwork at all", async () => {
    // Guessing a variation would leave an empty frame on the card: the CDN
    // 404s on one a type does not publish.
    mockImageService([]);
    expect(await resolveTypeImage(2)).toBeUndefined();
  });

  it("returns nothing when the image service is unavailable", async () => {
    mockImageService("unavailable");
    expect(await resolveTypeImage(587)).toBeUndefined();
  });

  it("returns nothing when the request throws", async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error("network")));
    expect(await resolveTypeImage(587)).toBeUndefined();
  });

  it.each([0, -1, 1.5, Number.NaN, null, undefined])(
    "never asks the service about %p",
    async (typeId) => {
      const fetchSpy = jest.fn();
      global.fetch = fetchSpy as unknown as typeof fetch;
      expect(await resolveTypeImage(typeId)).toBeUndefined();
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );
});
