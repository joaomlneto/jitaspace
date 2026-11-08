import {
  getCookieChunkName,
  getOAuthFlowCookieName,
  getOAuthResultCookieName,
  joinCookieChunks,
  splitCookieValue,
} from "../src/oauth/cookies";

describe("oauth cookie names", () => {
  it("applies the __Host- prefix only when the request is secure", () => {
    expect(getOAuthFlowCookieName(true)).toBe("__Host-eve.oauth.flow");
    expect(getOAuthFlowCookieName(false)).toBe("eve.oauth.flow");

    expect(getOAuthResultCookieName(true)).toBe("__Host-eve.oauth.result");
    expect(getOAuthResultCookieName(false)).toBe("eve.oauth.result");
  });
});

describe("cookie chunking", () => {
  it("keeps every chunk of a 42-scope login result under the 4096-byte cookie limit", () => {
    const sealed = "Fe26.2*" + "a".repeat(9000);
    const name = getOAuthResultCookieName(true);
    const chunks = splitCookieValue(sealed);
    expect(chunks).toHaveLength(3);
    chunks.forEach((chunk, index) =>
      expect(
        getCookieChunkName(name, index).length + chunk.length,
      ).toBeLessThanOrEqual(4096),
    );
    expect(chunks.join("")).toBe(sealed);
  });

  it("returns one chunk for a short or empty value", () => {
    expect(splitCookieValue("abc", 10)).toEqual(["abc"]);
    expect(splitCookieValue("", 10)).toEqual([""]);
  });

  it("rejects a non-positive chunk length", () => {
    expect(() => splitCookieValue("abc", 0)).toThrow(RangeError);
  });

  it("round-trips through joinCookieChunks regardless of cookie order", () => {
    const chunks = splitCookieValue("0123456789", 3);
    const jar = chunks
      .map((value, index) => ({ name: getCookieChunkName("c", index), value }))
      .reverse();
    expect(joinCookieChunks(jar, "c")).toEqual({
      value: "0123456789",
      names: ["c.3", "c.2", "c.1", "c.0"],
    });
  });

  it("stops at the first gap but still lists every chunk for clearing", () => {
    const jar = [
      { name: "c.0", value: "a" },
      { name: "c.2", value: "c" },
    ];
    expect(joinCookieChunks(jar, "c")).toEqual({
      value: "a",
      names: ["c.0", "c.2"],
    });
  });

  it("ignores cookies that only look like chunks", () => {
    const jar = [
      { name: "c", value: "legacy" },
      { name: "c.01", value: "x" },
      { name: "c.x", value: "x" },
      { name: "cc.0", value: "x" },
    ];
    expect(joinCookieChunks(jar, "c")).toEqual({
      value: undefined,
      names: [],
    });
  });
});
