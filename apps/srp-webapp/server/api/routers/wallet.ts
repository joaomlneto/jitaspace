import { z } from "zod";

import { getCorporationsCorporationIdWallets } from "@jitaspace/esi-client";
import { ESI_BASE_URL } from "@jitaspace/esi-hooks";

import { env } from "~/env.mjs";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { getTtlFromExpiresHeader } from "~/server/utils/getTtlFromExpiresHeader";
import { getValidAccessToken } from "~/server/utils/getValidAccessToken";

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
      { baseURL: ESI_BASE_URL },
    );

    const expires = result.headers["expires"];
    const ttl = getTtlFromExpiresHeader(expires);

    ctx.res.setHeader(
      "Cache-Control",
      `s-maxage=${ttl}, stale-while-revalidate=${3600}`,
    );

    return {
      fetchedOn: result.headers["last-modified"],
      divisions: result.data,
    };
  }),

  getAnonymizedLatestTransactions: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.prisma.corporationWalletJournalEntry.findMany({
      orderBy: [{ entryId: "desc" }],
      take: 50,
    });
    return result.map((dbResult) => {
      const amount = dbResult.amount ? dbResult.amount.toNumber() : 0;
      return {
        id: dbResult.entryId,
        amount: dbResult.amount,
        type:
          dbResult.entryType === "player_donation" && amount % 15000000 == 0
            ? "SRP Payment"
            : dbResult.entryType,
        date: dbResult.date,
      };
    });
  }),

  getMyLatestTransactions: protectedProcedure.query(async ({ ctx }) => {
    console.log("USER DATA", ctx.session.user);
    const result = await ctx.prisma.corporationWalletJournalEntry.findMany({
      where: {
        firstPartyId: ctx.session.user.id,
      },
      orderBy: [{ entryId: "desc" }],
      take: 50,
    });
    return result;
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message (if you are authed)!";
  }),

  getAdminMessage: adminProcedure.query(() => {
    return "you can now see this secret message (if you are an admin)!";
  }),
});
