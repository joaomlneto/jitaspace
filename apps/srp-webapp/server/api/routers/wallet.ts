import { z } from "zod";

import { getCorporationsCorporationIdWallets } from "@jitaspace/esi-client";
import { getEveSsoAccessTokenPayload } from "@jitaspace/esi-hooks";

import { env } from "~/env.mjs";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { prisma } from "~/server/db";

async function getValidAccessToken(): Promise<string> {
  // get a token from the DB
  const entry = await prisma.accountingTokens.findFirst();
  if (!entry) throw new Error("no tokens available");
  const { characterId, accessToken, refreshToken } = entry;

  // decode token and get its payload
  const payload = getEveSsoAccessTokenPayload(accessToken);
  if (!payload) throw new Error("unable to get token payload");

  // if token is valid and is not expiring soon, return it.
  if (Date.now() < Number(payload.sub) - 10000 /* 10 seconds */) {
    return accessToken;
  }

  // access token has expired or is about to, try to refresh it
  try {
    const url = "https://login.eveonline.com/v2/oauth/token";

    // Base64 encode the client ID and secret
    const headerString = `${env.EVE_CLIENT_ID}:${env.EVE_CLIENT_SECRET}`;
    const buff = Buffer.from(headerString, "utf-8");
    const authHeader = buff.toString("base64");

    const init = {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${authHeader}`,
        Host: "login.eveonline.com",
      },
    };

    console.log("init", init);

    const refreshedTokensResponse = await fetch(url, {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${authHeader}`,
        Host: "login.eveonline.com",
      },
    });

    if (!refreshedTokensResponse.ok) {
      console.log("could not refresh access token", {
        accessToken,
        characterId,
        response: refreshedTokensResponse,
      });
      throw new Error("error refreshing access token");
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const refreshedTokens: {
      access_token: string;
      expires_in: number;
      refresh_token: string;
    } = await refreshedTokensResponse.json();

    // if tokens changed, update in database
    if (
      refreshedTokens.access_token !== accessToken ||
      refreshedTokens.refresh_token !== refreshToken
    ) {
      console.log("UPDATING TOKENS IN DB");
      await prisma.accountingTokens.update({
        where: {
          characterId: characterId,
        },
        data: {
          accessToken: refreshedTokens.access_token,
          refreshToken: refreshedTokens.refresh_token,
        },
      });
    }

    return refreshedTokens.access_token;
  } catch (e) {
    throw new Error("Error refreshing access token");
  }
}

export const walletRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  getCorporationWalletBalance: publicProcedure.query(async ({ ctx }) => {
    const accessToken = await getValidAccessToken();

    const result = await getCorporationsCorporationIdWallets(
      Number(env.NEXT_PUBLIC_SRP_CORPORATION_ID),
      { token: accessToken },
    );
    const x = result.data;
    return x;
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message (if you are authed)!";
  }),

  getAdminMessage: protectedProcedure.query(() => {
    return "you can now see this secret message (if you are an admin)!";
  }),
});
