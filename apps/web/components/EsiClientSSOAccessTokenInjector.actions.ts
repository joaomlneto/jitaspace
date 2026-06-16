"use server";

import { refreshTokenApiRouteHandler } from "@jitaspace/auth";

import { env } from "~/env";

type RefreshTokenApiResponseBody =
  | { error: string }
  | {
      accessToken: string;
      refreshTokenData: string;
    };

interface RefreshTokenApiResult {
  statusCode: number;
  body: RefreshTokenApiResponseBody | undefined;
}

const refreshCharacterTokenResult = async (
  refreshTokenData: string,
): Promise<RefreshTokenApiResult> => {
  // `refreshTokenApiRouteHandler` is a framework-agnostic Web handler
  // (Request -> Response). We invoke it in-process here; the URL is unused by
  // the handler and only exists to satisfy the `Request` constructor.
  const response = await refreshTokenApiRouteHandler(
    new Request("https://jita.space/api/auth/refresh-token", {
      method: "POST",
      body: refreshTokenData,
    }),
    {
      nextAuthSecret: env.NEXTAUTH_SECRET,
      eveClientId: env.EVE_CLIENT_ID,
      eveClientSecret: env.EVE_CLIENT_SECRET,
    },
  );

  const body = (await response.json()) as RefreshTokenApiResponseBody;
  return { statusCode: response.status, body };
};

export async function refreshCharacterToken(refreshTokenData: string) {
  const { statusCode, body } =
    await refreshCharacterTokenResult(refreshTokenData);

  if (!body) {
    throw new Error("No response body.");
  }

  if ("error" in body) {
    throw new Error(body.error);
  }

  if (statusCode >= 400) {
    throw new Error("Unable to refresh token.");
  }

  return body;
}
