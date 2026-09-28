import { describe, expect, it } from "@jest/globals";

import { shouldRetryQuery } from "~/lib/queryRetry";

const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status } });

describe("shouldRetryQuery", () => {
  it("never retries a missing entity or an exhausted ESI error limit", () => {
    expect(shouldRetryQuery(0, httpError(404))).toBe(false);
    expect(shouldRetryQuery(0, httpError(420))).toBe(false);
  });

  it("retries what a retry can fix, up to React Query's default of three", () => {
    // 401/403 included: a request that raced a token refresh recovers on retry.
    for (const error of [
      httpError(401),
      httpError(403),
      httpError(429),
      httpError(502),
      new Error("Network Error"),
    ]) {
      expect(shouldRetryQuery(0, error)).toBe(true);
      expect(shouldRetryQuery(2, error)).toBe(true);
      expect(shouldRetryQuery(3, error)).toBe(false);
    }
  });

  it("tolerates errors that are not objects", () => {
    expect(shouldRetryQuery(0, null)).toBe(true);
    expect(shouldRetryQuery(0, "boom")).toBe(true);
  });
});
