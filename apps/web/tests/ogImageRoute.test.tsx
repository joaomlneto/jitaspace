/**
 * @jest-environment node
 *
 * The card renderer itself is satori/resvg, which is far too slow to rasterize
 * per assertion — so `next/og` is stubbed and these tests assert what the route
 * *decides*: the response contract, the caching, and that untrusted query input
 * reaches the card already sanitised. Runs on the node environment for the
 * global `Request`/`Response` the route handler takes and returns.
 */

import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

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

/** The card params the route handed to the (unrendered) card element. */
function cardProps() {
  return captured[0]?.element.props as Record<string, unknown> | undefined;
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
