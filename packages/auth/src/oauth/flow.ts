import { z } from "zod";

import {
  exchangeEveSsoToken,
  verifyEveSsoAccessToken,
} from "@jitaspace/auth-utils";

import { sealDataWithAuthSecret, unsealDataWithAuthSecret } from "../../utils";
import {
  EVE_AUTHORIZE_URL,
  OAUTH_FLOW_MAX_AGE_SECONDS,
  OAUTH_RESULT_MAX_AGE_SECONDS,
  PKCE_CODE_CHALLENGE_METHOD,
} from "./constants";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "./pkce";

/** Thrown for any expected failure in the OAuth flow (bad/expired/forged input). */
export class OAuthFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OAuthFlowError";
  }
}

const flowStateSchema = z.object({
  state: z.string().min(1),
  codeVerifier: z.string().min(1),
  returnTo: z.string(),
});
type FlowState = z.infer<typeof flowStateSchema>;

const loginResultSchema = z.object({
  accessToken: z.string().min(1),
  encryptedRefreshToken: z.string().min(1),
});
export type LoginResult = z.infer<typeof loginResultSchema>;

/**
 * Build the EVE SSO authorization URL and the sealed flow data that must be
 * stored in a short-lived, httpOnly cookie. The returned `sealedFlow` carries
 * the `state` (CSRF binding) and PKCE `code_verifier`.
 *
 * Credentials (`eveClientId`, `nextAuthSecret`) are supplied by the caller —
 * this package reads no environment variables of its own.
 */
export async function createLoginFlow(params: {
  scopes: string[];
  redirectUri: string;
  returnTo: string;
  eveClientId: string;
  nextAuthSecret: string;
}): Promise<{ authorizationUrl: string; sealedFlow: string }> {
  const { scopes, redirectUri, returnTo, eveClientId, nextAuthSecret } = params;

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const authorizationParams = new URLSearchParams({
    response_type: "code",
    redirect_uri: redirectUri,
    client_id: eveClientId,
    scope: scopes.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: PKCE_CODE_CHALLENGE_METHOD,
  });

  const sealedFlow = await sealDataWithAuthSecret({
    data: { state, codeVerifier, returnTo } satisfies FlowState,
    secret: nextAuthSecret,
    ttlMs: OAUTH_FLOW_MAX_AGE_SECONDS * 1000,
  });

  return {
    authorizationUrl: `${EVE_AUTHORIZE_URL}?${authorizationParams.toString()}`,
    sealedFlow,
  };
}

/**
 * Validate the callback against the sealed flow cookie, then exchange the
 * authorization code (+ PKCE verifier) for tokens. Returns the access token and
 * a sealed refresh-token blob in the same shape the rest of the app expects.
 *
 * Credentials (`eveClientId`, `eveClientSecret`, `nextAuthSecret`) are supplied
 * by the caller — this package reads no environment variables of its own.
 */
export async function completeLoginFlow(params: {
  code: string | null;
  state: string | null;
  sealedFlow: string | undefined;
  eveClientId: string;
  eveClientSecret: string;
  nextAuthSecret: string;
}): Promise<LoginResult & { returnTo: string }> {
  const {
    code,
    state,
    sealedFlow,
    eveClientId,
    eveClientSecret,
    nextAuthSecret,
  } = params;

  if (!sealedFlow) throw new OAuthFlowError("Missing OAuth flow cookie.");
  if (!code) throw new OAuthFlowError("Missing authorization code.");

  let flow: FlowState;
  try {
    flow = flowStateSchema.parse(
      await unsealDataWithAuthSecret({
        data: sealedFlow,
        secret: nextAuthSecret,
        ttlMs: OAUTH_FLOW_MAX_AGE_SECONDS * 1000,
      }),
    );
  } catch {
    throw new OAuthFlowError("OAuth flow cookie is invalid or expired.");
  }

  // CSRF / authorization-code-injection protection: the state returned by the
  // provider MUST equal the one we sealed into the (single-use) flow cookie.
  if (!state || state !== flow.state) {
    throw new OAuthFlowError("OAuth state mismatch.");
  }

  const tokens = await exchangeEveSsoToken({
    eveClientId,
    eveClientSecret,
    code,
    codeVerifier: flow.codeVerifier,
  });

  // Verify the token's signature against EVE's published JWKS (and the
  // iss/aud/exp claims) before trusting anything it contains.
  const payload = await verifyEveSsoAccessToken(tokens.access_token).catch(
    () => {
      throw new OAuthFlowError("Access token failed verification.");
    },
  );

  // Same sealed shape `refreshTokenApiRouteHandler` / `tokenRefreshDataSchema`
  // expect, so the existing refresh path can consume it unchanged.
  const encryptedRefreshToken = await sealDataWithAuthSecret({
    data: {
      accessTokenExpiration: payload.exp,
      refreshToken: tokens.refresh_token,
    },
    secret: nextAuthSecret,
  });

  return {
    accessToken: tokens.access_token,
    encryptedRefreshToken,
    returnTo: flow.returnTo,
  };
}

/** Seal the login result for the brief, single-use handoff cookie. */
export async function sealLoginResult(
  result: LoginResult,
  options: { nextAuthSecret: string },
): Promise<string> {
  return await sealDataWithAuthSecret({
    data: result satisfies LoginResult,
    secret: options.nextAuthSecret,
    ttlMs: OAUTH_RESULT_MAX_AGE_SECONDS * 1000,
  });
}

/** Unseal + validate the handoff cookie. Throws if tampered or expired. */
export async function readLoginResult(
  sealed: string,
  options: { nextAuthSecret: string },
): Promise<LoginResult> {
  return loginResultSchema.parse(
    await unsealDataWithAuthSecret({
      data: sealed,
      secret: options.nextAuthSecret,
      ttlMs: OAUTH_RESULT_MAX_AGE_SECONDS * 1000,
    }),
  );
}
