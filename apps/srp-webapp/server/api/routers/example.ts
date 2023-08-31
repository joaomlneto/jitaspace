import * as jose from "jose";
import { z } from "zod";

import { getCorporationsCorporationIdWallets } from "@jitaspace/esi-client";

import { env } from "~/env.mjs";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { prisma } from "~/server/db";

async function getValidAccessToken(): Promise<string> {
  const x = await prisma.accountingTokens.findFirst();
  const { characterId, accessToken, refreshToken } = x;
  // Check if token is valid (signature, expiration)
  const JWKS = jose.createRemoteJWKSet(
    new URL("https://login.eveonline.com/oauth/jwks"),
  );
  const token = await jose.jwtVerify(accessToken, JWKS, {
    issuer: "login.eveonline.com",
    audience: "EVE Online",
  });
  if (!token.payload.sub) {
    throw new Error("no subject found in token");
  }

  // if token is valid and is not expiring soon, return it.
  if (Date.now() < Number(token.payload.sub) - 10000 /* 10 seconds */) {
    return accessToken;
  }

  // access token has expired or is about to, try to refresh it
  try {
    const url = "https://login.eveonline.com/v2/oauth/token";

    // Base64 encode the client ID and secret
    const headerString = `${env.EVE_CLIENT_ID}:${env.EVE_CLIENT_SECRET}`;
    const buff = Buffer.from(headerString, "utf-8");
    const authHeader = buff.toString("base64");

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

export const exampleRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.accountingTokens.findMany();
  }),

  getCorporationWalletBalance: publicProcedure.query(async ({ ctx }) => {
    const tokens = await ctx.prisma.accountingTokens.findMany();
    const token = tokens[0];
    if (!token) throw new Error("No tokens available!");

    const result = await getCorporationsCorporationIdWallets(
      Number(env.NEXT_PUBLIC_SRP_CORPORATION_ID),
      { token: token?.accessToken },
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
