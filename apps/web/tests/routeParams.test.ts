import { describe, expect, it } from "@jest/globals";

import { parseEntityId, parsePositiveEntityId } from "~/lib/routeParams";

describe("parseEntityId", () => {
  it("accepts the canonical decimal spelling", () => {
    expect(parseEntityId("587")).toBe(587);
    expect(parseEntityId("1")).toBe(1);
    expect(parseEntityId("30000142")).toBe(30000142);
  });

  it("accepts 0, which /category/0 and /group/0 both need", () => {
    expect(parseEntityId("0")).toBe(0);
  });

  // Each of these returned HTTP 200 serving the Rifter before the fix.
  it.each(["0587", "587.0", "+587", " 587", "587 ", "587\n", "5e2", "0x24B"])(
    "rejects the non-canonical spelling %p",
    (raw) => {
      expect(parseEntityId(raw)).toBeNull();
    },
  );

  it("rejects negatives, empty and non-numeric segments", () => {
    expect(parseEntityId("-1")).toBeNull();
    expect(parseEntityId("")).toBeNull();
    expect(parseEntityId("abc")).toBeNull();
    expect(parseEntityId("12abc")).toBeNull();
    expect(parseEntityId(undefined)).toBeNull();
    expect(parseEntityId(null)).toBeNull();
  });

  it("rejects digit strings past the safe-integer range", () => {
    expect(parseEntityId("99999999999999999999")).toBeNull();
    expect(parseEntityId(String(Number.MAX_SAFE_INTEGER))).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });
});

describe("parsePositiveEntityId", () => {
  it("matches parseEntityId except at 0", () => {
    expect(parsePositiveEntityId("587")).toBe(587);
    expect(parsePositiveEntityId("0")).toBeNull();
    expect(parsePositiveEntityId("0587")).toBeNull();
    expect(parsePositiveEntityId("-3")).toBeNull();
  });
});
