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

async function validateSsoToken(accessToken: string) {
  // Check if token is valid (signature, expiration)
  const JWKS = jose.createRemoteJWKSet(
    new URL("https://login.eveonline.com/oauth/jwks"),
  );
  const x = await jose.jwtVerify(accessToken, JWKS, {
    issuer: "login.eveonline.com",
    audience: "EVE Online",
  });
  if (!x.payload.sub) {
    throw new Error("no subject found in token");
  }
}

async function refreshAccessTokenIfExpired({
  characterId,
  accessToken,
  refreshToken,
}: {
  characterId: string;
  accessToken: string;
  refreshToken: string;
}): Promise<string> {
  await validateSsoToken(accessToken);
  // TODO: work in progress
  return "";
}

async function getAccessToken() {
  const token = await prisma.accountingTokens.findFirst();
  if (!token) throw new Error("No tokens available");
  return token;
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
