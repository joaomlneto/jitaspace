/**
 * Fills the SolarSystemCostIndex change log from EVE Ref's archive of GET
 * /industry/systems (https://data.everef.net/industry-systems/), oldest first:
 * the yearly archives (parts of 2017–2022), then the hourly files from
 * 2022-12-16 to now.
 *
 * Run it before the hourly `esi-sync-industry-cost-indices` job's first run:
 * the log is append-only, so nothing can be inserted before the latest
 * snapshot. Re-running resumes after the latest snapshot stored; the job
 * replays whatever EVE Ref archived between this script's end and its own
 * first run.
 *
 *   pnpm --filter @jitaspace/background-jobs with-env \
 *     tsx scripts/bootstrapIndustryCostIndices.ts [options]
 *
 *   --archives 2017,2018,2019,2021,2022   yearly archives to read (or "none")
 *   --daily-from 2022-12-16               first day of hourly files to read
 *   --until <ISO time>                    stop after this time (default: now)
 *   --cache-dir <dir>                     downloads, kept for re-runs
 *   --dry-run                             count what would be written; write nothing
 *
 * Downloads are cached in `--cache-dir`, so a dry run followed by a real run
 * reads EVE Ref once. EVE Ref allows full downloads; requests go one at a
 * time and back off on its rate limit (see `everefIndustrySystems.ts`).
 */
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { parseArgs } from "node:util";
import { gunzipSync, gzipSync } from "node:zlib";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import tar from "tar-stream";
import bz2 from "unbzip2-stream";

import type { CostIndexSnapshotWrite } from "../helpers/costIndexStore.ts";
import type {
  CostIndexState,
  IndustrySystemsResponse,
} from "../helpers/industryCostIndices.ts";
import { prisma } from "../db";
import {
  appendCostIndexSnapshots,
  loadCostIndexState,
  loadLatestCostIndexSnapshot,
} from "../helpers/costIndexStore.ts";
import {
  EVEREF_DAILY_ARCHIVE_START,
  fetchEveRef,
  fetchEveRefBz2Text,
  listEveRefSnapshotsForDay,
  parseArchivedResponse,
} from "../helpers/everefIndustrySystems.ts";
import {
  applyCostIndexRows,
  diffCostIndexStates,
  isPartialSnapshot,
  parseEveRefSnapshotTime,
  parseIndustrySystems,
} from "../helpers/industryCostIndices.ts";

const YEARLY_ARCHIVES = [2017, 2018, 2019, 2021, 2022];

const { values: options } = parseArgs({
  options: {
    archives: { type: "string", default: YEARLY_ARCHIVES.join(",") },
    "daily-from": {
      type: "string",
      default: EVEREF_DAILY_ARCHIVE_START.toISOString().slice(0, 10),
    },
    until: { type: "string" },
    "cache-dir": {
      type: "string",
      default: join(tmpdir(), "jitaspace-everef-industry-systems"),
    },
    "dry-run": { type: "boolean", default: false },
  },
});

const archives =
  options.archives === "none"
    ? []
    : options.archives.split(",").map((year) => Number(year.trim()));
const dailyFrom = new Date(`${options["daily-from"]}T00:00:00Z`);
const until = options.until ? new Date(options.until) : new Date();
const cacheDir = options["cache-dir"];
const dryRun = options["dry-run"];

/** Snapshots per write transaction: about a day's worth. */
const FLUSH_EVERY = 24;

const log = (message: string) =>
  console.log(`${new Date().toISOString()} ${message}`);

// ---------------------------------------------------------------------------
// Replaying snapshots into the log

let previousAt: Date | null = null;
let writtenUpTo: Date | null = null;
let state: CostIndexState | null = null;
let knownSolarSystemIds: number[] = [];
let pending: CostIndexSnapshotWrite[] = [];
const totals = { snapshots: 0, rows: 0, skipped: 0, invalid: 0, partial: 0 };
const unknownActivities: Record<string, number> = {};
const rowsByMonth = new Map<string, number>();

async function flush() {
  if (pending.length === 0) return;
  if (!dryRun) {
    await appendCostIndexSnapshots(prisma, pending, writtenUpTo);
  }
  writtenUpTo = pending.at(-1)?.snapshotAt ?? writtenUpTo;
  pending = [];
}

/** Replays one archived response, if it is later than the log's end. */
async function ingest(
  time: Date,
  sourceFile: string,
  response: IndustrySystemsResponse | null,
) {
  if ((previousAt !== null && time <= previousAt) || time > until) {
    totals.skipped++;
    return;
  }
  if (response === null) {
    log(`skipped ${sourceFile}: not a GET /industry/systems response`);
    totals.invalid++;
    return;
  }
  const parsed = parseIndustrySystems(response);
  for (const [activity, count] of Object.entries(parsed.unknownActivities)) {
    unknownActivities[activity] = (unknownActivities[activity] ?? 0) + count;
  }
  state ??= await loadCostIndexState(prisma, [
    ...knownSolarSystemIds,
    ...parsed.state.keys(),
  ]);
  if (isPartialSnapshot(state, parsed.state)) {
    log(
      `skipped ${sourceFile}: lists ${parsed.state.size} systems, against ${state.size} before`,
    );
    totals.partial++;
    return;
  }
  const rows = diffCostIndexStates(state, parsed.state, time);
  state = applyCostIndexRows(state, rows);
  pending.push({
    snapshotAt: time,
    source: "everef",
    sourceFile,
    systemCount: parsed.state.size,
    rows,
  });
  previousAt = time;
  totals.snapshots++;
  totals.rows += rows.length;
  const month = time.toISOString().slice(0, 7);
  rowsByMonth.set(month, (rowsByMonth.get(month) ?? 0) + rows.length);
  if (pending.length >= FLUSH_EVERY) await flush();
}

// ---------------------------------------------------------------------------
// Yearly archives: a .tar.bz2 of JSON files in no particular order. Each entry
// is spilled to disk (gzipped, ~100 KB) so they can be replayed sorted without
// holding a year in memory.

async function downloadToFile(path: string, file: string) {
  if (existsSync(file)) return;
  const response = await fetchEveRef(path);
  if (response.body === null) throw new Error(`${path}: empty body`);
  await pipeline(
    Readable.fromWeb(response.body as NodeWebReadableStream<Uint8Array>),
    createWriteStream(`${file}.partial`),
  );
  await rename(`${file}.partial`, file);
}

async function spillArchive(archive: string, entriesDir: string) {
  const done = join(entriesDir, ".complete");
  if (existsSync(done)) return;
  await mkdir(entriesDir, { recursive: true });
  const extract = tar.extract();
  extract.on("entry", (header, stream, next) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("error", next);
    stream.on("end", () => {
      const time = parseEveRefSnapshotTime(header.name);
      if (time === null) {
        next();
        return;
      }
      writeFile(
        join(entriesDir, `${time.toISOString()}.json.gz`),
        gzipSync(Buffer.concat(chunks)),
      ).then(() => next(), next);
    });
  });
  await pipeline(createReadStream(archive), bz2(), extract);
  await writeFile(done, "");
}

async function replayArchive(year: number) {
  if (
    previousAt !== null &&
    previousAt >= new Date(`${year + 1}-01-01T00:00:00Z`)
  ) {
    log(`${year}: already stored`);
    return;
  }
  const name = `industry-systems-${year}.tar.bz2`;
  const archive = join(cacheDir, name);
  const entriesDir = join(cacheDir, `industry-systems-${year}`);
  log(`${year}: downloading ${name}`);
  await downloadToFile(`/industry-systems/history/${name}`, archive);
  log(`${year}: unpacking`);
  await spillArchive(archive, entriesDir);
  const entries = (await readdir(entriesDir))
    .filter((file) => file.endsWith(".json.gz"))
    .sort((a, b) => a.localeCompare(b));
  log(`${year}: replaying ${entries.length} snapshots`);
  for (const entry of entries) {
    const time = new Date(entry.replace(/\.json\.gz$/, ""));
    const json = gunzipSync(await readFile(join(entriesDir, entry))).toString(
      "utf8",
    );
    await ingest(
      time,
      `/industry-systems/history/${name}#${entry.replace(/\.gz$/, "")}`,
      parseArchivedResponse(json),
    ); // NOSONAR: in order, each diff depends on the last
  }
}

// ---------------------------------------------------------------------------
// Hourly files, one directory per day.

async function readDailyFile(
  path: string,
): Promise<IndustrySystemsResponse | null> {
  const file = join(
    cacheDir,
    "daily",
    path.replaceAll("/", "_").replace(/\.bz2$/, ".gz"),
  );
  if (existsSync(file)) {
    return parseArchivedResponse(
      gunzipSync(await readFile(file)).toString("utf8"),
    );
  }
  const text = await fetchEveRefBz2Text(path);
  // Written aside and renamed, so a concurrent run never reads half a file
  // (and two never write the same one).
  const partial = `${file}.${process.pid}.partial`;
  await writeFile(partial, gzipSync(text));
  await rename(partial, file);
  return parseArchivedResponse(text);
}

async function replayDaily() {
  await mkdir(join(cacheDir, "daily"), { recursive: true });
  const day = new Date(
    Math.max(
      dailyFrom.getTime(),
      previousAt?.getTime() ?? 0,
      EVEREF_DAILY_ARCHIVE_START.getTime(),
    ),
  );
  day.setUTCHours(0, 0, 0, 0);
  for (; day <= until; day.setUTCDate(day.getUTCDate() + 1)) {
    const files = (await listEveRefSnapshotsForDay(day)).filter(
      (file) =>
        (previousAt === null || file.time > previousAt) && file.time <= until,
    );
    for (const file of files) {
      await ingest(file.time, file.path, await readDailyFile(file.path)); // NOSONAR: in order
    }
    log(
      `${day.toISOString().slice(0, 10)}: ${files.length} snapshots; ${totals.snapshots} snapshots, ${totals.rows} rows so far`,
    );
  }
}

// ---------------------------------------------------------------------------

async function main() {
  await mkdir(cacheDir, { recursive: true });
  const latest = await loadLatestCostIndexSnapshot(prisma);
  previousAt = latest?.snapshotAt ?? null;
  writtenUpTo = previousAt;
  if (latest === null) state = new Map();
  knownSolarSystemIds = (
    await prisma.solarSystem.findMany({ select: { solarSystemId: true } })
  ).map((system) => system.solarSystemId);
  log(
    `${dryRun ? "DRY RUN: " : ""}resuming after ${previousAt?.toISOString() ?? "the beginning"}; cache in ${cacheDir}`,
  );

  for (const year of archives) {
    await replayArchive(year);
    await flush();
  }
  if (dailyFrom <= until) await replayDaily();
  await flush();

  log(
    `done: ${totals.snapshots} snapshots, ${totals.rows} rows${dryRun ? " (not written)" : ""}; skipped ${totals.skipped} already stored, ${totals.invalid} invalid, ${totals.partial} partial`,
  );
  if (Object.keys(unknownActivities).length > 0) {
    log(`activities with no column: ${JSON.stringify(unknownActivities)}`);
  }
  console.table([...rowsByMonth].map(([month, rows]) => ({ month, rows })));
}

await main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
