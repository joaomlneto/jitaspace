"use server";

import type { NextApiRequest, NextApiResponse } from "next";

import { refreshTokenApiRouteHandler } from "@jitaspace/auth";

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

const createNextApiResponseAdapter = () => {
  let statusCode = 200;
  let body: RefreshTokenApiResponseBody | undefined;

  const response = {
    setHeader() {
      return response;
    },
    status(code: number) {
      statusCode = code;
      return response;
    },
    json(value: RefreshTokenApiResponseBody) {
      body = value;
      return response;
    },
  } as unknown as NextApiResponse<RefreshTokenApiResponseBody>;

  return {
    response,
    result: () => ({ statusCode, body }),
  };
};

const refreshCharacterTokenResult = async (
  refreshTokenData: string,
): Promise<RefreshTokenApiResult> => {
  const { response, result } = createNextApiResponseAdapter();

  await refreshTokenApiRouteHandler(
    {
      body: refreshTokenData,
    } as NextApiRequest,
    response,
  );

  const { statusCode, body } = result();
  return { statusCode, body };
};

/**
 * Outcome of a refresh attempt. `requires-reauth` is an EXPECTED terminal state
 * (EVE will not renew the refresh token), not an exception — the caller should
 * drop the session and prompt re-authentication rather than retry. We return it
 * instead of throwing because Next.js redacts thrown Server Action messages in
 * production, so the client could not otherwise tell why the refresh failed.
 */
type RefreshTokenOutcome =
  | { status: "refreshed"; accessToken: string; refreshTokenData: string }
  | { status: "requires-reauth" }
  | { status: "error"; message: string };

export async function refreshCharacterToken(
  refreshTokenData: string,
): Promise<RefreshTokenOutcome> {
  let result: RefreshTokenApiResult;
  try {
    result = await refreshCharacterTokenResult(refreshTokenData);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to refresh token.",
    };
  }

  const { statusCode, body } = result;

  if (body && !("error" in body)) {
    return {
      status: "refreshed",
      accessToken: body.accessToken,
      refreshTokenData: body.refreshTokenData,
    };
  }

  // 410 Gone => the refresh token is too old for EVE to renew; the only remedy
  // is for the user to re-authenticate. Surface it explicitly so the caller can
  // drop the dead session instead of retrying the doomed refresh forever.
  if (statusCode === 410) {
    return { status: "requires-reauth" };
  }

  return {
    status: "error",
    message: body && "error" in body ? body.error : "Unable to refresh token.",
  };
}
