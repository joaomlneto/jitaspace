import { afterEach, describe, expect, it } from "@jest/globals";
import { environmentManager } from "@tanstack/react-query";

import { shouldRetryQuery } from "~/lib/queryRetry";

// The policy itself is tested in @jitaspace/esi-client (retry.test.ts); this
// checks the app's default applies it in the browser.
const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status } });

describe("shouldRetryQuery", () => {
  afterEach(() => {
    environmentManager.setIsServer(() => typeof window === "undefined");
  });

  it("never retries while rendering on the server, as React Query's default", () => {
    environmentManager.setIsServer(() => true);

    expect(shouldRetryQuery(0, httpError(503))).toBe(false);
  });

  it("applies the ESI retry policy in the browser", () => {
    expect(shouldRetryQuery(0, httpError(404))).toBe(false);
    expect(shouldRetryQuery(0, httpError(503))).toBe(true);
    expect(shouldRetryQuery(3, httpError(503))).toBe(false);
  });
});
