/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";

import { extractCharacterIdFromAccessToken } from "../lib/eveSsoToken";

function makeToken(sub: string | undefined): string {
  const payload = sub === undefined ? {} : { sub };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${b64}.signature`;
}

describe("extractCharacterIdFromAccessToken", () => {
  it("decodes the character id from the sub claim", () => {
    expect(
      extractCharacterIdFromAccessToken(makeToken("CHARACTER:EVE:90000001")),
    ).toBe(90000001);
  });

  it("returns undefined when the sub claim is missing", () => {
    expect(
      extractCharacterIdFromAccessToken(makeToken(undefined)),
    ).toBeUndefined();
  });

  it("returns undefined for a token without a payload segment", () => {
    expect(extractCharacterIdFromAccessToken("not-a-jwt")).toBeUndefined();
  });

  it("returns undefined when the id segment is not numeric", () => {
    expect(
      extractCharacterIdFromAccessToken(
        makeToken("CHARACTER:EVE:not-a-number"),
      ),
    ).toBeUndefined();
  });
});
