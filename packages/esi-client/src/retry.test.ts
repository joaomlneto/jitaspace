import { shouldRetryEsiRequest } from "./retry";

const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status } });

describe("shouldRetryEsiRequest", () => {
  it("never retries a missing entity or an exhausted ESI error limit", () => {
    expect(shouldRetryEsiRequest(0, httpError(404))).toBe(false);
    expect(shouldRetryEsiRequest(0, httpError(420))).toBe(false);
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
      expect(shouldRetryEsiRequest(0, error)).toBe(true);
      expect(shouldRetryEsiRequest(2, error)).toBe(true);
      expect(shouldRetryEsiRequest(3, error)).toBe(false);
    }
  });

  it("tolerates errors that are not objects", () => {
    expect(shouldRetryEsiRequest(0, null)).toBe(true);
    expect(shouldRetryEsiRequest(0, "boom")).toBe(true);
  });
});
