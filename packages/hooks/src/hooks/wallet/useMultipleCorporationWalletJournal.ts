"use client";

import type {
  GetCorporationsCorporationIdWalletsDivisionJournalQueryResponse,
  ResponseConfig,
} from "@jitaspace/esi-client";
import {
  getCorporationsCorporationIdWallets,
  getCorporationsCorporationIdWalletsDivisionJournal,
  getCorporationsCorporationIdWalletsDivisionJournalQueryKey,
} from "@jitaspace/esi-client";

import { defineMultiEsiQuery, esiPagedQueryOptions } from "../multi";

export type CorporationWalletJournalEntry =
  GetCorporationsCorporationIdWalletsDivisionJournalQueryResponse[number] & {
    /** Which of the corporation's wallet divisions this entry came from. */
    division: number;
  };

/**
 * Every corporation wallet journal entry the logged-in characters can read,
 * across all readable divisions, tagged with the corporation and the division.
 *
 * Hand-written rather than generated because the multi-hook generator rejects
 * any route carrying a path parameter besides the subject id
 * (`kubb/multiEsiEndpoints.ts:133`), and this route also carries `{division}`.
 * Everything else — subject enumeration, scope filtering, the Accountant role
 * requirement, per-subject error attribution and `subjectId` tagging — still
 * comes from {@link defineMultiEsiQuery}.
 *
 * Divisions are read from `/corporations/{id}/wallets/` rather than assumed to
 * be 1-7. That endpoint is the authority on which divisions the token can see,
 * and guessing would mean firing requests for divisions it cannot — ESI rate
 * limits on *error rate*, so a handful of 403s per corporation on every load
 * spends an error budget that is shared with the rest of the app.
 *
 * Divisions are then fetched one after another rather than in parallel. Each
 * one's pages already go through a five-request pool, so racing the divisions
 * as well would put dozens of requests in flight per corporation, multiplied by
 * every corporation in the fan-out.
 */
export const useMultipleCorporationWalletJournal = defineMultiEsiQuery({
  kind: "corporation",
  scopes: ["esi-wallet.read_corporation_wallets.v1"],
  roles: ["Accountant", "Junior_Accountant"],
  query: (corporationId, authHeaders) => ({
    queryKey: getCorporationsCorporationIdWalletsDivisionJournalQueryKey(
      corporationId,
      // Stands for "every division this token can read". A real division number
      // here would collide with a single-division query's cache entry.
      0,
    ),
    queryFn: async ({ signal }: { signal?: AbortSignal } = {}): Promise<
      ResponseConfig<CorporationWalletJournalEntry[]>
    > => {
      const wallets = await getCorporationsCorporationIdWallets(
        corporationId,
        authHeaders,
        { signal },
      );

      const entries: CorporationWalletJournalEntry[] = [];
      const failures: unknown[] = [];

      for (const { division } of wallets.data) {
        const pages = esiPagedQueryOptions({
          queryKey: getCorporationsCorporationIdWalletsDivisionJournalQueryKey(
            corporationId,
            division,
          ),
          fetchPage: (page, pageSignal) =>
            getCorporationsCorporationIdWalletsDivisionJournal(
              corporationId,
              division,
              { page },
              authHeaders,
              { signal: pageSignal },
            ),
        });

        try {
          const response = await pages.queryFn({ signal });
          for (const entry of response.data) {
            entries.push({ ...entry, division });
          }
        } catch (error: unknown) {
          // A division listed by /wallets/ can still refuse its journal —
          // Junior Accountant is commonly granted for one division only.
          // Collect rather than rethrow, so a readable division is not hidden
          // by an unreadable one.
          failures.push(error);
        }
      }

      // ...but if every division failed, this is an outage or a revoked role
      // rather than a permission boundary. Surfacing it lets the envelope
      // attribute the error to this corporation instead of showing an empty
      // wallet — which is what makes a broken integration look like an empty one.
      if (failures.length > 0 && failures.length === wallets.data.length) {
        throw failures[0];
      }

      return {
        data: entries,
      } as ResponseConfig<CorporationWalletJournalEntry[]>;
    },
  }),
});
