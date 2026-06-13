import {
  exchangeEveSsoToken,
  getEveSsoAccessTokenPayload,
} from "@jitaspace/auth-utils";

import {
  completeLoginFlow,
  createLoginFlow,
  OAuthFlowError,
  readLoginResult,
  sealLoginResult,
} from "../src/oauth";
import { unsealDataWithAuthSecret } from "../utils/unsealDataWithAuthSecret";

jest.mock("@jitaspace/auth-utils", () => ({
  exchangeEveSsoToken: jest.fn(),
  getEveSsoAccessTokenPayload: jest.fn(),
}));

// The package reads no env of its own — callers pass these in. @hapi/iron
// requires a secret of at least 32 characters.
const nextAuthSecret = "0123456789abcdef0123456789abcdef";
const eveClientId = "test-client-id";
const eveClientSecret = "test-client-secret";

const stateFromUrl = (authorizationUrl: string) =>
  new URL(authorizationUrl).searchParams.get("state")!;

describe("createLoginFlow", () => {
  it("builds an EVE authorize URL with PKCE + state and a matching sealed flow cookie", async () => {
    const { authorizationUrl, sealedFlow } = await createLoginFlow({
      scopes: ["publicData", "esi-skills.read_skills.v1"],
      redirectUri: "https://jita.space/api/auth/callback/eveonline",
      returnTo: "/skills",
      eveClientId,
      nextAuthSecret,
    });

    const url = new URL(authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(
      "https://login.eveonline.com/v2/oauth/authorize",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://jita.space/api/auth/callback/eveonline",
    );
    expect(url.searchParams.get("client_id")).toBe(eveClientId);
    expect(url.searchParams.get("scope")).toBe(
      "publicData esi-skills.read_skills.v1",
    );
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();

    const sealed = (await unsealDataWithAuthSecret({
      data: sealedFlow,
      secret: nextAuthSecret,
    })) as { state: string; codeVerifier: string; returnTo: string };
    expect(sealed.state).toBe(url.searchParams.get("state"));
    expect(sealed.returnTo).toBe("/skills");
    expect(typeof sealed.codeVerifier).toBe("string");
  });
});

describe("completeLoginFlow", () => {
  beforeEach(() => {
    (getEveSsoAccessTokenPayload as jest.Mock).mockReturnValue({
      exp: 9_999_999_999,
      sub: "CHARACTER:EVE:123",
    });
    (exchangeEveSsoToken as jest.Mock).mockResolvedValue({
      access_token: "AT",
      refresh_token: "RT",
      expires_in: 1199,
    });
  });

  it("verifies state, exchanges the code, and returns tokens + returnTo", async () => {
    const { authorizationUrl, sealedFlow } = await createLoginFlow({
      scopes: [],
      redirectUri: "https://jita.space/cb",
      returnTo: "/home",
      eveClientId,
      nextAuthSecret,
    });

    const result = await completeLoginFlow({
      code: "the-code",
      state: stateFromUrl(authorizationUrl),
      sealedFlow,
      eveClientId,
      eveClientSecret,
      nextAuthSecret,
    });

    expect(result.accessToken).toBe("AT");
    expect(result.returnTo).toBe("/home");
    expect(typeof result.encryptedRefreshToken).toBe("string");
    expect(exchangeEveSsoToken).toHaveBeenCalledTimes(1);
    expect(exchangeEveSsoToken).toHaveBeenCalledWith(
      expect.objectContaining({ eveClientId, eveClientSecret }),
    );
  });

  it("throws when the flow cookie is missing", async () => {
    await expect(
      completeLoginFlow({
        code: "c",
        state: "s",
        sealedFlow: undefined,
        eveClientId,
        eveClientSecret,
        nextAuthSecret,
      }),
    ).rejects.toBeInstanceOf(OAuthFlowError);
  });

  it("throws when the authorization code is missing", async () => {
    const { authorizationUrl, sealedFlow } = await createLoginFlow({
      scopes: [],
      redirectUri: "https://jita.space/cb",
      returnTo: "/",
      eveClientId,
      nextAuthSecret,
    });
    await expect(
      completeLoginFlow({
        code: null,
        state: stateFromUrl(authorizationUrl),
        sealedFlow,
        eveClientId,
        eveClientSecret,
        nextAuthSecret,
      }),
    ).rejects.toBeInstanceOf(OAuthFlowError);
  });

  it("rejects a mismatched state (CSRF protection)", async () => {
    const { sealedFlow } = await createLoginFlow({
      scopes: [],
      redirectUri: "https://jita.space/cb",
      returnTo: "/",
      eveClientId,
      nextAuthSecret,
    });
    await expect(
      completeLoginFlow({
        code: "c",
        state: "WRONG",
        sealedFlow,
        eveClientId,
        eveClientSecret,
        nextAuthSecret,
      }),
    ).rejects.toThrow(/state mismatch/i);
    expect(exchangeEveSsoToken).not.toHaveBeenCalled();
  });
});

describe("sealLoginResult / readLoginResult", () => {
  it("round-trips the login result", async () => {
    const sealed = await sealLoginResult(
      { accessToken: "AT", encryptedRefreshToken: "ERT" },
      { nextAuthSecret },
    );
    expect(await readLoginResult(sealed, { nextAuthSecret })).toEqual({
      accessToken: "AT",
      encryptedRefreshToken: "ERT",
    });
  });
});
