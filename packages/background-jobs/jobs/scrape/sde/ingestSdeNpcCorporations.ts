import type { NpcCorporationRecord } from "./npcCorporationTransforms";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFiles,
} from "../../../helpers";
import {
  mergeNpcCorporationChildRows,
  planLegacyEnlistmentMoves,
  toNpcCorporationChildRows,
  toSdeCorporationRow,
} from "./npcCorporationTransforms";

export interface IngestSdeNpcCorporationsEventPayload {
  data: Record<string, never>;
}

/**
 * npcCorporations.yaml — the 283 NPC corporations' own attributes, which until now
 * were read only to resolve names for the faction and station ingests.
 *
 * Two constraints shape this job:
 *
 * 1. `Corporation` also holds every player corporation, and its `memberCount` /
 *    `name` are required columns the SDE does not supply (`memberCount` is not in
 *    the file at all). So this job must never CREATE a row: it scopes itself to
 *    corporation ids that already exist locally. When scrape-esi-npc-corporations
 *    creates an NPC corporation it sends this job, so the new row gets its SDE
 *    columns without waiting for the next build. `ingestSdeTable` already bounds
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
    // Guarded against the Faction table rather than factions.yaml: `factionId`
    // is a foreign key, and this job also runs on its own, possibly before
    // ingest-sde-factions has created a faction a new build adds.
    const factionIds = new Set(
      await prisma.faction
        .findMany({ select: { factionId: true } })
        .then((rows) => rows.map(({ factionId }) => factionId)),
    );

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
      toRow: (record, id) => toSdeCorporationRow(record, id, factionIds),
    });

    // Clear the Faction Warfare enlistments `factionId` held before ESI's rename
    // from every corporation outside npcCorporations.yaml, moving each into
    // `enlistedFactionId` first. A no-op once done; see planLegacyEnlistmentMoves.
    const { moves, clear } = planLegacyEnlistmentMoves(
      await prisma.corporation.findMany({
        where: { factionId: { not: null }, corporationId: { notIn: sdeIds } },
        select: {
          corporationId: true,
          factionId: true,
          enlistedFactionId: true,
        },
      }),
    );
    for (const [factionId, corporationIds] of moves) {
      await prisma.corporation.updateMany({
        where: { corporationId: { in: corporationIds } },
        data: { enlistedFactionId: factionId },
      });
    }
    if (clear.length > 0) {
      await prisma.corporation.updateMany({
        where: { corporationId: { in: clear } },
        data: { factionId: null },
      });
    }

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
        legacyEnlistmentsCleared: clear.length,
      },
      elapsed: performance.now() - start,
    };
  },
});
