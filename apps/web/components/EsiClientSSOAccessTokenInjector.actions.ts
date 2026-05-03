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
