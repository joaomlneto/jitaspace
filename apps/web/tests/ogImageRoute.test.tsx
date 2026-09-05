/**
 * @jest-environment node
 *
 * Rasterising through satori/resvg is far too slow to do per assertion, so
 * `next/og` is stubbed and the card element it would have rasterised is
 * captured instead. These tests assert what the route *decides* — the response
 * contract, the caching, that untrusted query input arrives sanitised — and
 * then render the captured element to static markup to assert what it actually
 * draws. Runs on the node environment for the global `Request`/`Response` the
 * route handler takes and returns.
 */

import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";

interface Captured {
  element: ReactElement;
  options: Record<string, unknown>;
}
const captured: Captured[] = [];

jest.mock("next/og", () => ({
  ImageResponse: class {
    status = 200;
    headers: Headers;
    constructor(element: ReactElement, options: Record<string, unknown>) {
      captured.push({ element, options });
      this.headers = new Headers(options.headers as Record<string, string>);
    }
  },
}));

/** The card params the route handed to the card element. */
function cardProps() {
  return captured[0]?.element.props as Record<string, unknown> | undefined;
}

/**
 * The card as HTML. Satori consumes the same element tree, so rendering it here
 * exercises the real layout code — every branch that decides whether a badge,
 * a subtitle, the fact chips or the artwork frame is drawn at all.
 */
function cardMarkup() {
  const element = captured[0]?.element;
  if (!element) throw new Error("no card was rendered");
  return renderToStaticMarkup(element);
}

async function get(query: string) {
  const { GET } = await import("~/app/api/og/route");
  return GET(new Request(`https://www.jita.space/api/og?${query}`));
}

describe("GET /api/og", () => {
  beforeEach(() => {
    captured.length = 0;
    jest.resetModules();
  });

  it("renders a 1200x630 card", async () => {
    await get("title=Jita");
    expect(captured[0]?.options).toMatchObject({ width: 1200, height: 630 });
  });

  it("caches the response — crawlers refetch og:image on every unfurl", async () => {
    const response = await get("title=Jita");
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=");
  });

  it("draws the title, badge, subtitle and facts it was given", async () => {
    await get(
      "title=Jita&badge=Solar+System&subtitle=Trade+hub&fact=Region%7CThe+Forge",
    );
    expect(cardProps()).toMatchObject({
      title: "Jita",
      badge: "Solar System",
      subtitle: "Trade hub",
      facts: [{ label: "Region", value: "The Forge" }],
    });
  });

  it("clamps an over-long title before it reaches the card", async () => {
    await get(`title=${"x".repeat(300)}`);
    expect(cardProps()?.title).toHaveLength(80);
  });

  it("400s without a title instead of unfurling empty chrome", async () => {
    const response = await get("badge=Solar+System");
    expect(response.status).toBe(400);
    expect(captured).toHaveLength(0);
  });

  it("does not embed an image from a host outside the allow-list", async () => {
    await get("title=Jita&image=https%3A%2F%2Fevil.example.com%2Fx.png");
    const html = JSON.stringify(captured[0]?.element);
    expect(html).not.toContain("evil.example.com");
  });

  it("embeds artwork from the EVE CDN", async () => {
    const image = "https://images.evetech.net/types/587/render?size=512";
    await get(`title=Rifter&image=${encodeURIComponent(image)}`);
    expect(JSON.stringify(captured[0]?.element)).toContain(
      "images.evetech.net/types/587/render",
    );
  });
});

describe("the card it draws", () => {
  beforeEach(() => {
    captured.length = 0;
    jest.resetModules();
  });

  it("draws the title, badge, subtitle and every fact chip", async () => {
    await get(
      "title=Jita&badge=Solar+System&subtitle=Trade+hub&fact=Region%7CThe+Forge&fact=Security%7C0.9",
    );
    const html = cardMarkup();
    for (const text of [
      "Jita",
      "Solar System",
      "Trade hub",
      "Region",
      "The Forge",
      "Security",
      "0.9",
    ]) {
      expect(html).toContain(text);
    }
  });

  it("always carries the site's own name and domain", async () => {
    await get("title=Jita");
    const html = cardMarkup();
    expect(html).toContain("Jitaspace");
    expect(html).toContain("jita.space");
  });

  it("omits the badge, subtitle and fact row when given none", async () => {
    await get("title=Jita");
    const html = cardMarkup();
    expect(html).not.toContain("Trade hub");
    // The artwork frame is the only <img> the card can draw.
    expect(html).not.toContain("<img");
  });

  it("draws the artwork frame only when there is artwork", async () => {
    const image = "https://images.evetech.net/types/587/render?size=512";
    await get(`title=Rifter&image=${encodeURIComponent(image)}`);
    expect(cardMarkup()).toContain(image.replace(/&/g, "&amp;"));
  });

  // EVE names run from "Jita" to "Jita IV - Moon 4 - Caldari Navy Assembly
  // Plant", so the title steps down through three sizes rather than being
  // ellipsised. Each case below is one arm of that ternary.
  it.each([
    ["Jita", 82],
    ["Pandemic Horde Incorporated", 68],
    ["Jita IV - Moon 4 - Caldari Navy Assembly Plant", 54],
  ])("draws %p at %ipx", async (title, size) => {
    await get(`title=${encodeURIComponent(title)}`);
    expect(cardMarkup()).toContain(`font-size:${size}px`);
  });
});

describe("when the renderer itself fails", () => {
  beforeEach(() => {
    captured.length = 0;
    jest.resetModules();
  });

  it("500s rather than serving a half-drawn card", async () => {
    jest.doMock("next/og", () => ({
      ImageResponse: class {
        constructor() {
          throw new Error("satori exploded");
        }
      },
    }));
    const { GET } = await import("~/app/api/og/route");
    const response = GET(
      new Request("https://www.jita.space/api/og?title=Jita"),
    );
    expect(response.status).toBe(500);
    jest.dontMock("next/og");
  });
});
