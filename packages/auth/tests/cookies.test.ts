import {
  getOAuthFlowCookieName,
  getOAuthResultCookieName,
} from "../src/oauth/cookies";

describe("oauth cookie names", () => {
  it("applies the __Host- prefix only when the request is secure", () => {
    expect(getOAuthFlowCookieName(true)).toBe("__Host-eve.oauth.flow");
    expect(getOAuthFlowCookieName(false)).toBe("eve.oauth.flow");

    expect(getOAuthResultCookieName(true)).toBe("__Host-eve.oauth.result");
    expect(getOAuthResultCookieName(false)).toBe("eve.oauth.result");
  });
});
