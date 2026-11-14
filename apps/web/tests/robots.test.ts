import { describe, expect, it, jest } from "@jest/globals";

import { CRAWLER_DISALLOWED_PATHS } from "~/config/seo.ts";

// `./sitemap` pulls in the database client and the env; robots only needs its
// index URL.
jest.mock("~/app/sitemap", () => ({
  SITEMAP_INDEX_URL: "https://www.jita.space/sitemap.xml",
}));

function rulesFor(userAgent: string) {
  const { default: robots } = require("~/app/robots") as {
    default: () => {
      rules: {
        userAgent?: string;
        disallow?: string | string[];
        crawlDelay?: number;
      }[];
    };
  };
  return robots().rules.find((rule) => rule.userAgent === userAgent);
}

describe("robots.txt", () => {
  it("keeps Meta's AI-training crawler out entirely", () => {
    expect(rulesFor("meta-externalagent")?.disallow).toBe("/");
  });

  it("slows AhrefsBot down without letting it into logged-in pages", () => {
    const rule = rulesFor("AhrefsBot");

    expect(rule?.crawlDelay).toBeGreaterThanOrEqual(10);
    // A crawler follows only the most specific group naming it, so this group
    // must carry the `*` disallow list itself.
    expect(rule?.disallow).toEqual([...CRAWLER_DISALLOWED_PATHS, "/api/og"]);
  });

  it.each([
    "AhrefsBot",
    "PerplexityBot",
    "ExaSearchBot",
    "ExaSearchBot-Images",
  ])(
    "keeps %s off the generated card images but not off the pages",
    (userAgent) => {
      const rule = rulesFor(userAgent);

      expect(rule?.disallow).toContain("/api/og");
      expect(rule?.disallow).not.toBe("/");
      expect(rule?.disallow).toEqual(
        expect.arrayContaining([...CRAWLER_DISALLOWED_PATHS]),
      );
    },
  );

  it("leaves the card images open to everyone else, for link previews", () => {
    expect(rulesFor("*")?.disallow).toEqual([...CRAWLER_DISALLOWED_PATHS]);
  });
});
