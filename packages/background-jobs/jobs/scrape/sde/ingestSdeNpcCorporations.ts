import type { Prisma } from "../../../db";
import type { SDE_OWNED_CORPORATION_COLUMNS } from "../../../helpers";
import type { NpcCorporationRecord } from "./npcCorporationTransforms";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFiles,
  optionalBoolean,
  optionalNumber,
  plainString,
} from "../../../helpers";
import {
  mergeNpcCorporationChildRows,
  toNpcCorporationChildRows,
} from "./npcCorporationTransforms";

export interface IngestSdeNpcCorporationsEventPayload {
  data: Record<string, never>;
}

/**
 * The primary key plus exactly the SDE-owned columns — `ingestSdeTable` writes
 * only the columns `toRow` returns, so the ESI-owned required ones
 * (`name`, `memberCount`, `ticker`, `taxRate`) must stay out of this type.
 */
type SdeCorporationRow = Pick<
  Prisma.CorporationCreateManyInput,
  "corporationId" | (typeof SDE_OWNED_CORPORATION_COLUMNS)[number]
>;

/**
 * npcCorporations.yaml — the 283 NPC corporations' own attributes, which until now
 * were read only to resolve names for the faction and station ingests.
 *
 * Two constraints shape this job:
 *
 * 1. `Corporation` also holds every player corporation, and its `memberCount` /
 *    `name` are required columns the SDE does not supply (`memberCount` is not in
 *    the file at all). So this job must never CREATE a row: it scopes itself to
 *    corporation ids that already exist locally, leaving any NPC corp the ESI
 *    scraper has not yet fetched for the next run. `ingestSdeTable` already bounds
 *    its diff to the ids it is given, so nothing outside that set is soft-deleted.
 * 2. `ceoID`, `taxRate` and `tickerName` are deliberately not taken from the SDE —
 *    ESI owns `ceoId` / `taxRate` / `ticker` for all corporations, and writing them
 *    from here would make the two scrapers fight over the same columns.
 */
export const ingestSdeNpcCorporations = defineJob<
  IngestSdeNpcCorporationsEventPayload["data"]
>({
  id: "ingest-sde-npc-corporations",
  name: "Ingest SDE NPC Corporations",
  description:
    "Download the SDE and ingest npcCorporations.yaml into the Corporation table's SDE-only columns plus the NpcCorporation* detail tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["npcCorporations.yaml"]);
    const all = files["npcCorporations.yaml"];

    // Only corporations that already exist — see the note above.
    const sdeIds = Object.keys(all).map(Number);
    const existing = new Set(
      await prisma.corporation
        .findMany({
          where: { corporationId: { in: sdeIds } },
          select: { corporationId: true },
        })
        .then((rows) => rows.map((row) => row.corporationId)),
    );
    const records: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(all)) {
      if (existing.has(Number(key))) records[key] = value;
    }
    const scopeIds = Object.keys(records).map(Number);

    const corporations = await ingestSdeTable({
      filename: "npcCorporations.yaml",
      records,
      idField: "corporationId",
      delegate: prisma.corporation,
      toRow: (record, id): SdeCorporationRow => ({
        corporationId: id,
        extent: plainString(record.extent),
        memberLimit: optionalNumber(record.memberLimit),
        minSecurity: optionalNumber(record.minSecurity),
        minimumJoinStanding: optionalNumber(record.minimumJoinStanding),
        initialPrice: optionalNumber(record.initialPrice),
        hasPlayerPersonnelManager: optionalBoolean(
          record.hasPlayerPersonnelManager,
        ),
        sendCharTerminationMessage: optionalBoolean(
          record.sendCharTerminationMessage,
        ),
        mainActivityId: optionalNumber(record.mainActivityID),
        secondaryActivityId: optionalNumber(record.secondaryActivityID),
        enemyId: optionalNumber(record.enemyID),
        friendId: optionalNumber(record.friendID),
        size: plainString(record.size),
        sizeFactor: optionalNumber(record.sizeFactor),
        isUnique: optionalBoolean(record.uniqueName),
        // CCP's own `deleted` marker, kept apart from the ingest's `isDeleted`
        // soft-delete flag (which this job does not own — the ESI scraper does).
        isDeletedByCcp: optionalBoolean(record.deleted),
        // Plain ids, not relations: nothing dangles today (0 of 261 / 257 / 252
        // miss mapSolarSystems.yaml / races.yaml / icons.yaml) and the columns
        // carry no FK, so no `present()` guard is needed.
        solarSystemId: optionalNumber(record.solarSystemID),
        raceId: optionalNumber(record.raceID),
        iconId: optionalNumber(record.iconID),
        // NOTE: no `name`, `memberCount`, `ticker`, `taxRate` or `ceoId` — those are
        // ESI-owned. Omitting them also keeps them out of ingestSdeTable's managed
        // key set, so the diff leaves them untouched.
      }),
    });

    const {
      allowedRaces,
      lpOfferTables,
      divisions,
      investors,
      trades,
      exchangeRates,
    } = mergeNpcCorporationChildRows(
      Object.entries(records).map(([key, value]) =>
        toNpcCorporationChildRows(
          Number(key),
          value as NpcCorporationRecord,
          existing,
        ),
      ),
    );

    const child = <Row extends Record<string, unknown>>(
      delegate: Parameters<typeof ingestSdeCompositeTable>[0]["delegate"],
      rows: Row[],
      keyFields: (keyof Row & string)[],
    ) =>
      ingestSdeCompositeTable({
        delegate,
        rows,
        keyFields,
        scopeField: "corporationId",
        scopeIds,
      });

    const npcCorporationAllowedRaces = await child(
      prisma.npcCorporationAllowedRace,
      allowedRaces,
      ["corporationId", "raceId"],
    );
    const npcCorporationLpOfferTables = await child(
      prisma.npcCorporationLpOfferTable,
      lpOfferTables,
      ["corporationId", "lpOfferTableId"],
    );
    const npcCorporationDivisions = await child(
      prisma.npcCorporationDivisionSlot,
      divisions,
      ["corporationId", "npcCorporationDivisionId"],
    );
    const npcCorporationInvestors = await child(
      prisma.npcCorporationInvestor,
      investors,
      ["corporationId", "investorCorporationId"],
    );
    const npcCorporationTrades = await child(
      prisma.npcCorporationTrade,
      trades,
      ["corporationId", "typeId"],
    );
    const npcCorporationExchangeRates = await child(
      prisma.npcCorporationExchangeRate,
      exchangeRates,
      ["corporationId", "otherCorporationId"],
    );

    return {
      stats: {
        corporations,
        npcCorporationAllowedRaces,
        npcCorporationLpOfferTables,
        npcCorporationDivisions,
        npcCorporationInvestors,
        npcCorporationTrades,
        npcCorporationExchangeRates,
        skipped: sdeIds.length - scopeIds.length,
      },
      elapsed: performance.now() - start,
    };
  },
});
