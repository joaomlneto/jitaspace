import { describe, expect, it } from "@jest/globals";

import { SENTRY_DENY_URLS, SENTRY_IGNORE_ERRORS } from "~/lib/sentryNoise";

const denied = (url: string) =>
  SENTRY_DENY_URLS.some((pattern) => pattern.test(url));

const ignored = (message: string) =>
  SENTRY_IGNORE_ERRORS.some((pattern) =>
    typeof pattern === "string"
      ? message.includes(pattern)
      : pattern.test(message),
  );

describe("Sentry noise filters", () => {
  it("drop errors thrown from extensions and injected userscripts", () => {
    expect(denied("chrome-extension://abcdef/inpage.js")).toBe(true);
    expect(denied("moz-extension://1234/content.js")).toBe(true);
    expect(denied("safari-web-extension://x/script.js")).toBe(true);
    // Both the frame as thrown and as the SDK rewrites it.
    expect(denied("https://www.jita.space/executors/200.js")).toBe(true);
    expect(denied("app:///executors/200.js")).toBe(true);
    expect(ignored("i: Failed to connect to MetaMask")).toBe(true);
  });

  it("never drop the app's own frames", () => {
    for (const url of [
      "https://www.jita.space/_next/static/chunks/3ckcchfbp9xzu.js",
      "app:///_next/static/chunks/3ckcchfbp9xzu.js",
      "app:///_next/server/chunks/ssr/page.js",
      "https://www.jita.space/lp-store/1000125",
    ]) {
      expect(denied(url)).toBe(false);
    }
    expect(
      ignored("TypeError: Cannot read properties of undefined (reading 'x')"),
    ).toBe(false);
  });
});
