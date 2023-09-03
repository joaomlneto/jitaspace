import { type NextApiRequest, type NextApiResponse } from "next";
import axios, { AxiosResponse } from "axios";

import { getCorporationsCorporationIdWalletsDivisionJournal } from "@jitaspace/esi-client";
import { ESI_BASE_URL } from "@jitaspace/esi-hooks";

import { env } from "~/env.mjs";
import { prisma } from "~/server/db";
import { getTtlFromExpiresHeader } from "~/server/utils/getTtlFromExpiresHeader";
import { getValidAccessToken } from "~/server/utils/getValidAccessToken";

export default async function NextApiRouteHandler(
  req: NextApiRequest,
  res: NextApiResponse<
    | { error: string }
    | {
        esiNumResultsFetched: number;
        dbNumAffectedRows: number;
        ttl: number;
      }
  >,
) {
  // FIXME: configure axios; but this should be done out of the box!
  axios.defaults.baseURL = ESI_BASE_URL;

  // FIXME TODO: Authorization!
  const accessToken = await getValidAccessToken();

  // fetch missing data from database
  const CORP_DIVISIONS = [1, 2, 3, 4, 5, 6, 7];

  let ttl = Infinity;
  const updateTtlFromExpires = (res: AxiosResponse) =>
    (ttl = Math.min(ttl, getTtlFromExpiresHeader(res.headers["expires"])));

  const entries = (
    await Promise.all(
      CORP_DIVISIONS.map(async (divisionId) => {
        // fetch the first page of this division
        const firstPage =
          await getCorporationsCorporationIdWalletsDivisionJournal(
            Number(env.NEXT_PUBLIC_SRP_CORPORATION_ID),
            divisionId,
            {},
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );
        updateTtlFromExpires(firstPage);

        // check how many pages are there
        const numPages = parseInt(firstPage.headers["x-pages"] ?? "1");
        const missingPageNumbers = [...Array(numPages - 1).keys()].map(
          (n) => n + 2,
        );

        // fetch the results from the other pages
        const missingPages = await Promise.all(
          missingPageNumbers.map(async (page) => {
            const result =
              await getCorporationsCorporationIdWalletsDivisionJournal(
                Number(env.NEXT_PUBLIC_SRP_CORPORATION_ID),
                divisionId,
                { page },
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                },
              );
            updateTtlFromExpires(result);
            return result.data ?? [];
          }),
        );

        // return all of them (in no particular order)
        return [...firstPage.data, ...missingPages.flat()].map((entry) => ({
          ...entry,
          divisionId,
        }));
      }),
    )
  ).flat();

  // convert ESI schema to db schema
  const dbEntries = entries.map((entry) => ({
    entryId: entry.id,
    entryType: entry.ref_type,
    corporationId: Number(env.NEXT_PUBLIC_SRP_CORPORATION_ID),
    division: entry.divisionId,
    amount: entry.amount,
    balance: entry.balance,
    contextId: entry.context_id,
    contextIdType: entry.context_id_type,
    date: entry.date,
    description: entry.description,
    firstPartyId: entry.first_party_id,
    reason: entry.reason,
    secondPartyId: entry.second_party_id,
    tax: entry.tax,
    taxReceiverId: entry.tax_receiver_id,
  }));

  // update the results in the database
  const queryResult = await prisma.corporationWalletJournalEntry.createMany({
    data: dbEntries,
    skipDuplicates: true,
  });

  // return statistics
  return res.json({
    esiNumResultsFetched: entries.length,
    dbNumAffectedRows: queryResult.count,
    ttl,
  });
}
