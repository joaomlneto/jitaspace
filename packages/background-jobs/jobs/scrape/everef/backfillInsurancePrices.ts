import { Readable } from "node:stream";
import pLimit from "p-limit";
import bz2 from "unbzip2-stream";
import { z } from "zod";

import type { EveRefInsuranceFile } from "../../../helpers/insurancePriceBackfill.ts";
import type { InsurancePriceValues } from "../../../helpers/planInsurancePriceUpdates.ts";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  dayPaths,
  groupIntoRuns,
} from "../../../helpers/insurancePriceBackfill.ts";
import { parseInsurancePriceList } from "../../../helpers/planInsurancePriceUpdates.ts";
import { recordInsurancePriceSnapshot } from "../../../helpers/recordInsurancePriceSnapshot.ts";

const EVEREF_HISTORY_URL = "https://data.everef.net/insurance-prices/history";
/** EVE Ref asks to be told who is downloading. */
export const EVEREF_USER_AGENT = "JitaSpace (https://www.jita.space)";
/** The first day EVE Ref archived. */
export const EVEREF_INSURANCE_HISTORY_START = new Date("2022-12-16T00:00:00Z");
/** EVE Ref rate-limits bursts; three requests at a time stays under it. */
const EVEREF_CONCURRENCY = 3;
const EVEREF_ATTEMPTS = 6;

export interface BackfillEveRefInsurancePricesPayload {
  /** ISO timestamp; files after it are imported. Defaults to EVE Ref's first. */
  from?: string;
  /** ISO timestamp; files up to it are imported. Defaults to now. */
  to?: string;
}

const dayIndexSchema = z.object({
  files: z
    .array(
      z.object({
        url: z.string().url(),
        etag: z.string(),
        file_time: z.string().datetime(),
      }),
    )
    .default([]),
});

const priceListSchema = z.array(
  z.object({
    type_id: z.number().int(),
    levels: z.array(
      z.object({ name: z.string(), cost: z.number(), payout: z.number() }),
    ),
  }),
);

/** GET with EVE Ref's User-Agent, backing off on 429 and 5xx. */
async function fetchEveRef(url: string): Promise<Response | null> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, {
      headers: { "User-Agent": EVEREF_USER_AGENT },
      signal: AbortSignal.timeout(60_000),
    });
    if (response.ok) return response;
    if (response.status === 404) return null;
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt >= EVEREF_ATTEMPTS) {
      throw new Error(`EVE Ref ${url}: ${response.status}`);
    }
    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, 5_000 * attempt));
  }
}

async function listFiles(from: Date, to: Date): Promise<EveRefInsuranceFile[]> {
  const limit = pLimit(EVEREF_CONCURRENCY);
  const days = await Promise.all(
    dayPaths(from, to).map((path) =>
      limit(async () => {
        // A day EVE Ref archived nothing for has no index.
        const response = await fetchEveRef(
          `${EVEREF_HISTORY_URL}/${path}/index.json`,
        );
        return response
          ? dayIndexSchema.parse(await response.json()).files
          : [];
      }),
    ),
  );
  return days
    .flat()
    .map((file) => ({
      url: file.url,
      etag: file.etag,
      observedAt: new Date(file.file_time),
    }))
    .filter((file) => file.observedAt > from && file.observedAt <= to)
    .sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime());
}

async function downloadPrices(
  url: string,
): Promise<Map<number, InsurancePriceValues>> {
  const response = await fetchEveRef(url);
  if (!response) throw new Error(`EVE Ref ${url}: not found`);
  // A file is ~20 KB compressed; unbzip2-stream is a classic stream, not an
  // async iterable, so it is drained through its events.
  const compressed = Buffer.from(await response.arrayBuffer());
  const json = await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    Readable.from([compressed])
      .pipe(bz2())
      .on("data", (chunk: Buffer) => chunks.push(chunk))
      .on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
      .on("error", reject);
  });
  return parseInsurancePriceList(priceListSchema.parse(JSON.parse(json)));
}

export const backfillEveRefInsurancePrices =
  defineJob<BackfillEveRefInsurancePricesPayload>({
    id: "backfill-everef-insurance-prices",
    name: "Backfill insurance prices from EVE Ref",
    trigger: { type: "event" },
    // Runs writing the same stretch would race on its rows.
    concurrencyLimit: 1,
    // Each run is recorded in its own transaction and recorded files are
    // skipped, so a retry resumes where the last attempt stopped.
    retries: 3,
    // The full archive is ~1,400 day indexes and ~700 distinct lists.
    maxDurationSeconds: 60 * 60,
    description:
      "Import EVE Ref's hourly archive of ESI's insurance price list, for the bootstrap and to fill gaps in our own polling",
    handler: async (ctx) => {
      const from = ctx.payload.from
        ? new Date(ctx.payload.from)
        : EVEREF_INSURANCE_HISTORY_START;
      const to = ctx.payload.to ? new Date(ctx.payload.to) : new Date();
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        throw new Error("`from` and `to` must be ISO timestamps");
      }

      const files = await ctx.run("list EVE Ref files", () =>
        listFiles(from, to),
      );
      const recorded = (
        await prisma.insurancePriceSnapshot.findMany({
          select: { observedAt: true },
          where: { observedAt: { gt: from, lte: to } },
        })
      ).map((row) => row.observedAt);
      const runs = groupIntoRuns(files, recorded);
      ctx.logger.info("Importing insurance prices from EVE Ref", {
        files: files.length,
        alreadyRecorded: recorded.length,
        runs: runs.length,
      });

      const stats = { runs: 0, snapshots: 0, changedTypes: 0, skipped: 0 };
      // Consecutive runs split only by a recorded observation share a list.
      let cached: { etag: string; prices: Map<number, InsurancePriceValues> } =
        { etag: "", prices: new Map() };
      for (const [first, ...rest] of runs) {
        if (!first) continue;
        if (cached.etag !== first.etag) {
          cached = {
            etag: first.etag,
            prices: await downloadPrices(first.url),
          };
        }
        const observation = {
          observedAt: first.observedAt,
          source: "everef" as const,
          prices: cached.prices,
          repeatedAt: rest.map((file) => file.observedAt),
        };
        // One run at a time: each diffs against what the last one wrote.
        const result = await recordInsurancePriceSnapshot(observation); // NOSONAR
        if (!result.recorded) {
          stats.skipped++;
          continue;
        }
        stats.runs++;
        stats.snapshots += result.snapshots;
        stats.changedTypes += result.changedTypes;
        if (stats.runs % 50 === 0) {
          ctx.logger.info("Insurance price backfill progress", {
            ...stats,
            of: runs.length,
            at: first.observedAt.toISOString(),
          });
        }
      }

      return { stats: { files: files.length, ...stats } };
    },
  });
