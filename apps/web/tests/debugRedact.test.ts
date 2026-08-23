/**
 * @jest-environment node
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "@jest/globals";

import {
  FINGERPRINT_DOMAIN,
  FINGERPRINT_LENGTH,
  redactEnvValue,
} from "../app/debug/redact";

const SECRET = "a".repeat(44);
const DATABASE_URL =
  "postgresql://jita_app:s3cr3t@db.example.com:5432/jitaspace?schema=public&sslmode=require";

describe("redactEnvValue", () => {
  it("reduces an unrecognised secret to presence, length and a fingerprint", () => {
    const redacted = redactEnvValue("NEXTAUTH_SECRET", SECRET);
    expect(redacted).not.toContain(SECRET);
    expect(redacted).toMatch(/^set · 44 chars · sha256:[0-9a-f]{12}$/);
  });

  it("pins the documented fingerprint recipe", () => {
    // The domain is spelled out rather than read from FINGERPRINT_DOMAIN: using
    // the constant would make this assert `impl(x) === impl(x)`, which still
    // passes after a domain change and would silently desync the reproduction
    // command in redact.ts's doc comment:
    //
    //   printf 'jitaspace:debug:v1%s' "$CRON_SECRET" | sha256sum | cut -c1-12
    //
    // Changing the domain is sanctioned — bump the version suffix — but it must
    // change this literal and that comment together.
    expect(FINGERPRINT_DOMAIN).toBe("jitaspace:debug:v1");
    expect(FINGERPRINT_LENGTH).toBe(12);

    const expected = createHash("sha256")
      .update("jitaspace:debug:v1" + SECRET)
      .digest("hex")
      .slice(0, 12);
    expect(redactEnvValue("CRON_SECRET", SECRET)).toBe(
      `set · 44 chars · sha256:${expected}`,
    );
  });

  it("is stable for one value and distinguishes two of the same length", () => {
    expect(redactEnvValue("CRON_SECRET", SECRET)).toBe(
      redactEnvValue("CRON_SECRET", SECRET),
    );
    expect(redactEnvValue("CRON_SECRET", SECRET)).not.toBe(
      redactEnvValue("CRON_SECRET", "b".repeat(44)),
    );
  });

  it("defaults to redaction for an unknown key", () => {
    const redacted = redactEnvValue("SOME_FUTURE_TOKEN", "super-secret-value");
    expect(redacted).not.toContain("super-secret-value");
    expect(redacted).toMatch(/^set · 18 chars · sha256:[0-9a-f]{12}$/);
  });

  it("keeps the useful half of a connection string and masks the rest", () => {
    const redacted = redactEnvValue("DATABASE_URL", DATABASE_URL);
    expect(redacted).toContain("postgresql://jita_app:***@");
    expect(redacted).toContain("db.example.com:5432/jitaspace");
    expect(redacted).toContain("schema=…");
    expect(redacted).toContain("sslmode=…");
    expect(redacted).not.toContain("s3cr3t");
    expect(redacted).not.toContain("public");
    expect(redacted).not.toContain("require");
    expect(redacted).toMatch(/ · sha256:[0-9a-f]{12}$/);
  });

  it("round-trips a credential-free connection string", () => {
    const redacted = redactEnvValue("REDIS_URL", "redis://localhost:6379");
    expect(redacted).toMatch(
      /^redis:\/\/localhost:6379 · sha256:[0-9a-f]{12}$/,
    );
  });

  it("never echoes a connection-string var that is not a URL", () => {
    const redacted = redactEnvValue("REDIS_URL", "not-a-url");
    expect(redacted).not.toContain("not-a-url");
    expect(redacted).toMatch(/^set · 9 chars · sha256:[0-9a-f]{12}$/);
  });

  it("fails closed when the password mis-parses instead of throwing", () => {
    // The authority ends at the first "/", "?" or "#", so a password holding an
    // unencoded one of those parses with an EMPTY url.password and leaves the
    // credentials in the path or query — where echoing them back would defeat
    // the whole point of this module.
    const misparsing = [
      "postgresql://jita_app/x:hunter2@db.example.com:5432/jitaspace",
      "postgresql://jita_app?x:hunter2@db.example.com:5432/jitaspace",
      "postgresql://jita_app#x:hunter2@db.example.com:5432/jitaspace",
    ];

    for (const value of misparsing) {
      const redacted = redactEnvValue("DATABASE_URL", value);
      expect(redacted).not.toContain("hunter2");
      expect(redacted).toMatch(/^set · \d+ chars · sha256:[0-9a-f]{12}$/);
    }
  });

  it("still masks a password-only connection string", () => {
    // The common Redis shape: no username, password only. This must keep
    // rendering rather than being swept up by the fail-closed rule above.
    const redacted = redactEnvValue(
      "REDIS_URL",
      "redis://:hunter2@redis.example.com:6379",
    );
    expect(redacted).not.toContain("hunter2");
    expect(redacted).toContain("redis://:***@redis.example.com:6379");
  });

  it("shows public vars in full", () => {
    for (const key of [
      "NODE_ENV",
      "NEXT_RUNTIME",
      "EVE_CLIENT_ID",
      "SKIP_BUILD_STATIC_GENERATION",
      "HISTORY_DATABASE_SCHEMA",
      "AUTH_TRUSTED_ORIGINS",
      "VERCEL_URL",
      "VERCEL_BRANCH_URL",
      "VERCEL_PROJECT_PRODUCTION_URL",
    ]) {
      expect(redactEnvValue(key, "visible-value")).toBe("visible-value");
    }
    expect(redactEnvValue("NEXT_PUBLIC_ANYTHING", "visible-value")).toBe(
      "visible-value",
    );
  });

  it("shows NEXT_PUBLIC_SITE_URL in full rather than masking it as a URL", () => {
    expect(
      redactEnvValue("NEXT_PUBLIC_SITE_URL", "https://www.jita.space"),
    ).toBe("https://www.jita.space");
  });

  it("distinguishes unset from set-but-empty", () => {
    expect(redactEnvValue("CRON_SECRET", undefined)).toBe("not set");
    expect(redactEnvValue("CRON_SECRET", "")).toBe("set, but empty");
  });
});
