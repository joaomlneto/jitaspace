/**
 * The `/api/og` query string is a contract between `generateMetadata` (writer)
 * and the route handler (reader). The route is public, so the reader treats
 * everything as untrusted: these tests pin the clamping and the image-host
 * allow-list that keep a crafted URL from rendering arbitrary content, or
 * embedding an arbitrary remote image, under our own domain.
 */

import { describe, expect, it } from "@jest/globals";

import { buildOgImageUrl, parseOgImageParams } from "~/lib/og";

function roundTrip(params: Parameters<typeof buildOgImageUrl>[0]) {
  const url = buildOgImageUrl(params);
  return parseOgImageParams(
    new URL(url, "https://www.jita.space").searchParams,
  );
}

describe("buildOgImageUrl", () => {
  it("returns a relative URL so Next resolves it against metadataBase", () => {
    expect(buildOgImageUrl({ title: "Jita" })).toMatch(/^\/api\/og\?/);
  });

  it("round-trips title, subtitle, badge and facts", () => {
    expect(
      roundTrip({
        title: "Jita",
        subtitle: "The busiest trade hub in New Eden.",
        badge: "Solar System",
        facts: [
          { label: "Security", value: "0.9" },
          { label: "Region", value: "The Forge" },
        ],
      }),
    ).toEqual({
      title: "Jita",
      subtitle: "The busiest trade hub in New Eden.",
      badge: "Solar System",
      image: undefined,
      facts: [
        { label: "Security", value: "0.9" },
        { label: "Region", value: "The Forge" },
      ],
    });
  });

  it("keeps a fact value containing the separator intact", () => {
    const { facts } = roundTrip({
      title: "Station",
      facts: [{ label: "Owner", value: "Bob | Corp" }],
    });
    expect(facts).toEqual([{ label: "Owner", value: "Bob | Corp" }]);
  });

  it("drops facts beyond the third so the row cannot overflow", () => {
    const { facts } = roundTrip({
      title: "Jita",
      facts: [
        { label: "A", value: "1" },
        { label: "B", value: "2" },
        { label: "C", value: "3" },
        { label: "D", value: "4" },
      ],
    });
    expect(facts).toHaveLength(3);
  });

  it("collapses whitespace so EVE's multi-line descriptions render on one line", () => {
    expect(roundTrip({ title: "  Jita \n\t Trade  Hub " }).title).toBe(
      "Jita Trade Hub",
    );
  });

  it("truncates an over-long title with an ellipsis", () => {
    const { title } = roundTrip({ title: "x".repeat(200) });
    expect(title).toHaveLength(80);
    expect(title.endsWith("…")).toBe(true);
  });

  it("omits an empty or whitespace-only field entirely", () => {
    const parsed = roundTrip({ title: "Jita", subtitle: "   ", badge: "" });
    expect(parsed.subtitle).toBeUndefined();
    expect(parsed.badge).toBeUndefined();
  });
});

describe("image host allow-list", () => {
  it.each([
    "https://images.evetech.net/types/587/render?size=512",
    "https://icons.jita.space/foo.png",
    "https://web.ccpgamescdn.com/foo.png",
  ])("accepts %s", (image) => {
    expect(roundTrip({ title: "Jita", image }).image).toBe(image);
  });

  it.each([
    ["a host we do not control", "https://evil.example.com/tracker.png"],
    ["a look-alike subdomain", "https://images.evetech.net.evil.com/x.png"],
    ["plain http", "http://images.evetech.net/types/587/render"],
    ["a data URI", "data:image/png;base64,AAAA"],
    ["a non-URL", "not-a-url"],
  ])("rejects %s", (_label, image) => {
    expect(roundTrip({ title: "Jita", image }).image).toBeUndefined();
  });

  it("rejects a disallowed host supplied directly on the query string", () => {
    const params = new URLSearchParams({
      title: "Jita",
      image: "https://evil.example.com/tracker.png",
    });
    expect(parseOgImageParams(params).image).toBeUndefined();
  });
});

describe("parseOgImageParams", () => {
  it("reports an empty title when the param is missing", () => {
    expect(parseOgImageParams(new URLSearchParams()).title).toBe("");
  });

  it("ignores a fact with no separator rather than rendering a blank chip", () => {
    const params = new URLSearchParams();
    params.append("fact", "no-separator-here");
    expect(parseOgImageParams(params).facts).toEqual([]);
  });
});
