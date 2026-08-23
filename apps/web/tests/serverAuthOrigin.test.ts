/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockEnv: Record<string, string | undefined> = {};

jest.mock("~/env", () => ({ env: mockEnv }));

const load = () =>
  (
    require("../lib/serverAuth") as {
      getRequestOrigin: (req: NextRequest) => string;
    }
  ).getRequestOrigin;

/**
 * The request URL is deliberately a host the allow-list does NOT contain.
 *
 * `getRequestOrigin` tries `x-forwarded-host`, then `Host`, then
 * `req.nextUrl.host`. Building these on `https://www.jita.space` would make
 * every "rejects an untrusted host" case pass through that third candidate
 * instead of through the fallback — green even if the fallback were broken.
 * Anchoring on an untrusted URL means the fallback is the only way those cases
 * can reach the canonical origin.
 */
const req = (host: string | null, extra: Record<string, string> = {}) =>
  new NextRequest("https://untrusted.invalid/api/auth/login", {
    headers: host ? { "x-forwarded-host": host, ...extra } : extra,
  });

beforeEach(() => {
  jest.resetModules();
  for (const key of Object.keys(mockEnv)) delete mockEnv[key];
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

describe("getRequestOrigin", () => {
  it("accepts the canonical www host and the derived apex", () => {
    const getRequestOrigin = load();
    expect(getRequestOrigin(req("www.jita.space"))).toBe(
      "https://www.jita.space",
    );
    expect(getRequestOrigin(req("jita.space"))).toBe("https://jita.space");
  });

  it("derives www from a configured apex canonical", () => {
    mockEnv.NEXT_PUBLIC_SITE_URL = "https://jita.space";
    const getRequestOrigin = load();
    expect(getRequestOrigin(req("www.jita.space"))).toBe(
      "https://www.jita.space",
    );
    expect(getRequestOrigin(req("jita.space"))).toBe("https://jita.space");
  });

  it("rejects lookalike, suffix and userinfo hosts", () => {
    const getRequestOrigin = load();
    for (const host of [
      "evil.example",
      "evil-jita.space",
      "jita.space.evil.example",
      "jita.space@evil.example",
      "evil.example:8443",
      "sub.jita.space",
    ]) {
      expect(getRequestOrigin(req(host))).toBe("https://www.jita.space");
    }
  });

  it("normalises trailing dots, case and explicit default ports", () => {
    const getRequestOrigin = load();
    expect(getRequestOrigin(req("JITA.space."))).toBe("https://jita.space");
    expect(getRequestOrigin(req("jita.space:443"))).toBe("https://jita.space");
  });

  it("ignores x-forwarded-proto on a trusted host", () => {
    const getRequestOrigin = load();
    expect(
      getRequestOrigin(req("jita.space", { "x-forwarded-proto": "http" })),
    ).toBe("https://jita.space");
  });

  it("falls back to the Host header when x-forwarded-host is untrusted", () => {
    const getRequestOrigin = load();
    expect(
      getRequestOrigin(req("evil.example", { host: "www.jita.space" })),
    ).toBe("https://www.jita.space");
  });

  it("uses req.nextUrl.host as the last candidate", () => {
    // Pins the third branch of the candidate loop, so the `req()` helper above
    // can stay anchored on an untrusted URL without leaving it uncovered.
    const getRequestOrigin = load();
    const fromUrl = new NextRequest("https://jita.space/api/auth/login", {
      headers: { "x-forwarded-host": "evil.example" },
    });
    expect(getRequestOrigin(fromUrl)).toBe("https://jita.space");
  });

  it("accepts loopback hosts on any port outside production", () => {
    const getRequestOrigin = load();
    const local = new NextRequest("http://localhost:3000/api/auth/login", {
      headers: { host: "localhost:3000" },
    });
    expect(getRequestOrigin(local)).toBe("http://localhost:3000");
  });

  it("rejects loopback in production", () => {
    mockEnv.NODE_ENV = "production";
    const getRequestOrigin = load();
    const local = new NextRequest("http://localhost:3000/api/auth/login", {
      headers: { host: "localhost:3000" },
    });
    expect(getRequestOrigin(local)).toBe("https://www.jita.space");
  });

  it("trusts the Vercel deployment hostnames", () => {
    mockEnv.NODE_ENV = "production";
    mockEnv.VERCEL_BRANCH_URL = "jita-git-feature-team.vercel.app";
    const getRequestOrigin = load();
    expect(getRequestOrigin(req("jita-git-feature-team.vercel.app"))).toBe(
      "https://jita-git-feature-team.vercel.app",
    );
    expect(getRequestOrigin(req("other-tenant.vercel.app"))).toBe(
      "https://www.jita.space",
    );
  });

  it("honours AUTH_TRUSTED_ORIGINS and ignores malformed entries", () => {
    mockEnv.AUTH_TRUSTED_ORIGINS =
      "https://staging.jita.space, http://192.168.1.10:3000 ,not a url,*.vercel.app";
    const getRequestOrigin = load();
    expect(getRequestOrigin(req("staging.jita.space"))).toBe(
      "https://staging.jita.space",
    );
    expect(getRequestOrigin(req("192.168.1.10:3000"))).toBe(
      "http://192.168.1.10:3000",
    );
    expect(getRequestOrigin(req("anything.vercel.app"))).toBe(
      "https://www.jita.space",
    );
  });

  it("derives no sibling for a non-registrable canonical host", () => {
    // `pnpm dev` loads .env.development, whose NEXT_PUBLIC_SITE_URL is
    // http://localhost:3000. `localhost` is not a `label.tld`, so no `www.`
    // sibling is invented — the dev origin is trusted only as configured.
    mockEnv.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    const getRequestOrigin = load();
    expect(getRequestOrigin(req("localhost:3000"))).toBe(
      "http://localhost:3000",
    );
    expect(getRequestOrigin(req("www.localhost:3000"))).toBe(
      "http://localhost:3000",
    );
  });

  it("rejects header smuggling attempts", () => {
    const getRequestOrigin = load();
    expect(getRequestOrigin(req("evil.example, jita.space"))).toBe(
      "https://www.jita.space",
    );
    expect(getRequestOrigin(req("jita.space/../evil.example"))).toBe(
      "https://www.jita.space",
    );
  });

  it("keeps the canonical scheme when a trusted origin re-declares it as http", () => {
    // "First writer wins" in buildTrustedOrigins: the canonical origin is added
    // before AUTH_TRUSTED_ORIGINS, so an entry for a host we already serve
    // cannot downgrade it — which would drop `Secure`/`__Host-` on the OAuth
    // cookies for that host.
    mockEnv.AUTH_TRUSTED_ORIGINS = "http://www.jita.space,http://jita.space";
    const getRequestOrigin = load();
    expect(getRequestOrigin(req("www.jita.space"))).toBe(
      "https://www.jita.space",
    );
    expect(getRequestOrigin(req("jita.space"))).toBe("https://jita.space");
  });

  it("never returns an origin outside the configured set", () => {
    // The property the allow-list exists to guarantee, asserted over the shapes
    // that have historically defeated origin checks elsewhere: homographs,
    // percent-encoding, padded and oversized ports, extra trailing dots,
    // userinfo, and comma smuggling in both orders.
    const getRequestOrigin = load();
    const configured = new Set([
      "https://www.jita.space",
      "https://jita.space",
    ]);
    const hosts = [
      "evil.example",
      "jita.space..",
      ".jita.space",
      "xn--jta-sna.space",
      "jita.space%00.evil.example",
      "jita%2Espace",
      "jita.space:00443",
      "jita.space:443443",
      "jita.space:0",
      "jita.space:8080",
      "jita.space,evil.example",
      "evil.example,jita.space",
      "jita.space#@evil.example",
      "*.jita.space",
      "",
      `${"a".repeat(300)}.jita.space`,
    ];

    for (const host of hosts) {
      expect(configured.has(getRequestOrigin(req(host)))).toBe(true);
    }
  });
});
