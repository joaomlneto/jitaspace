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
      const isSrpPayment =
        dbResult.entryType === "player_donation" &&
        amount % 15000000 == 0 &&
        amount <= 180000000;
      const numSrps = amount / 15000000;
      return {
        id: dbResult.entryId,
        amount: dbResult.amount,
        type: isSrpPayment
          ? "SRP Payment" + (numSrps > 1 ? ` x ${numSrps}` : "")
          : dbResult.entryType,
        date: dbResult.date,
      };
    });
  }),

  getMyLatestTransactions: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.prisma.corporationWalletJournalEntry.findMany({
      where: {
        firstPartyId: ctx.session.user.id,
      },
      orderBy: [{ entryId: "desc" }],
      take: 50,
    });
    return result;
  }),

  getAllLatestTransactions: adminProcedure.query(async ({ ctx }) => {
    const dbQueryResult =
      await ctx.prisma.corporationWalletJournalEntry.findMany({
        orderBy: [{ entryId: "desc" }],
        take: 500,
      });

    return dbQueryResult.map((entry) => {
      const amount = entry.amount ? entry.amount.toNumber() : 0;
      const isSrpPayment =
        entry.entryType === "player_donation" &&
        amount % 15000000 == 0 &&
        amount <= 180000000;
      const numSrps = amount / 15000000;
      return {
        ...entry,
        entryType: isSrpPayment
          ? "SRP Payment" + (numSrps > 1 ? ` x ${numSrps}` : "")
          : entry.entryType,
        //reason: isSrpPayment ? "yes" : "no",
      };
    });
  }),
});
