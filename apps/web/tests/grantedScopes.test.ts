import { describe, expect, it } from "@jest/globals";

import { grantedScopesOf } from "~/lib/grantedScopes";

describe("grantedScopesOf", () => {
  it("keeps a list as it is", () => {
    expect(grantedScopesOf(["publicData", "esi-mail.read_mail.v1"])).toEqual([
      "publicData",
      "esi-mail.read_mail.v1",
    ]);
  });

  it("wraps the lone scope EVE SSO writes as a string, instead of spreading its letters", () => {
    expect(grantedScopesOf("publicData")).toEqual(["publicData"]);
  });

  it("treats a missing claim as no scopes", () => {
    expect(grantedScopesOf(undefined)).toEqual([]);
  });
});
