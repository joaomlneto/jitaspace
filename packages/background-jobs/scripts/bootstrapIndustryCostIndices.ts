/**
 * Fills the SolarSystemCostIndex change log from EVE Ref's archive of GET
 * /industry/systems (https://data.everef.net/industry-systems/), oldest first:
 * the yearly archives of past years (from 2017-11-29; there is no 2020), then
 * the current year's hourly files up to now.
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
 *   --archives all|none|2017,2018,…  yearly archives to read (default: all)
 *   --daily-from <YYYY-MM-DD>        first day of hourly files to read
 *                                    (default: where the archives end)
 *   --until <ISO time>               stop after this time (default: now)
 *   --cache-dir <dir>                downloads, kept for re-runs
 *   --dry-run                        count what would be written; write nothing
 *   --cluster                        afterwards, rewrite the table in system order
 *                                    (see below)
 *
 * Downloads are cached in `--cache-dir`, so a dry run followed by a real run
 * reads EVE Ref once. EVE Ref allows full downloads; requests go one at a
 * time and back off on its rate limit (see `everefIndustrySystems.ts`). The
 * yearly archives are `.tar.xz`, decompressed by the system's `xz` (Node has
 * no xz decoder), which is about ten times faster than decoding in
 * JavaScript would be.
 *
 * The log is written in time order, so one system's rows end up one per table
 * page: a busy system's whole history (~21k rows) reads ~24k pages. `--cluster`
 * runs CLUSTER on the primary key once the import is done, which cuts that to
 * a few hundred and rebuilds the index ~30% smaller (measured on Postgres 18
 * with 41M rows: 45 s locally). It locks the table while it runs, so pause the
 * hourly job first. Rows the job appends later are not clustered; re-run
 * CLUSTER now and then if long ranges get slow.
 */
import { spawn } from "node:child_process";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  statSync,
} from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
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
import type { EveRefYearlyArchive } from "../helpers/everefIndustrySystems.ts";
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
  EveRefNotFoundError,
  fetchEveRef,
  fetchEveRefBz2Text,
  listEveRefSnapshotsForDay,
  listEveRefYearlyArchives,
  parseArchivedResponse,
} from "../helpers/everefIndustrySystems.ts";
import {
  applyCostIndexRows,
  diffCostIndexStates,
  isPartialSnapshot,
  parseEveRefSnapshotTime,
  parseIndustrySystems,
} from "../helpers/industryCostIndices.ts";

const { values: options } = parseArgs({
  options: {
    archives: { type: "string", default: "all" },
    "daily-from": { type: "string" },
    until: { type: "string" },
    "cache-dir": {
      type: "string",
      default: join(tmpdir(), "jitaspace-everef-industry-systems"),
    },
    "dry-run": { type: "boolean", default: false },
    cluster: { type: "boolean", default: false },
  },
});

const archiveYears: "all" | Set<number> =
  options.archives === "all"
    ? "all"
    : new Set(
        options.archives === "none"
          ? []
          : options.archives.split(",").map((year) => Number(year.trim())),
      );
const dailyFrom = options["daily-from"]
  ? new Date(`${options["daily-from"]}T00:00:00Z`)
  : null;
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
// Yearly archives: one .tar.xz per past year, its entries in time order, so it
// is streamed straight into the replay.

/** Whole downloads retried when the connection drops mid-file. */
const DOWNLOAD_ATTEMPTS = 3;

async function downloadToFile(archive: EveRefYearlyArchive, file: string) {
  const whole = () =>
    existsSync(file) &&
    (archive.size === null || statSync(file).size === archive.size);
  for (let attempt = 1; !whole(); attempt++) {
    try {
      const response = await fetchEveRef(archive.path);
      if (response.body === null)
        throw new Error(`${archive.path}: empty body`);
      await pipeline(
        Readable.fromWeb(response.body as NodeWebReadableStream<Uint8Array>),
        createWriteStream(`${file}.partial`),
      );
      await rename(`${file}.partial`, file);
    } catch (error) {
      if (
        error instanceof EveRefNotFoundError ||
        attempt >= DOWNLOAD_ATTEMPTS
      ) {
        throw error;
      }
      log(`retrying ${archive.path}: ${String(error)}`);
    }
  }
}

/** Calls `onEntry` with each file in a .tar.xz (or .tar.bz2), in order. */
async function readArchive(
  file: string,
  onEntry: (name: string, text: string) => Promise<void>,
) {
  const extract = tar.extract();
  extract.on("entry", (header, stream, next) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("error", next);
    stream.on("end", () => {
      onEntry(header.name, Buffer.concat(chunks).toString("utf8")).then(
        () => next(),
        next,
      );
    });
  });
  if (!file.endsWith(".xz")) {
    await pipeline(createReadStream(file), bz2(), extract);
    return;
  }
  const xz = spawn("xz", ["-dc", file], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  const exited = new Promise<void>((resolve, reject) => {
    xz.on("error", reject);
    xz.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`xz exited with ${code} reading ${file}`));
    });
  });
  await Promise.all([pipeline(xz.stdout, extract), exited]);
}

async function replayArchive(archive: EveRefYearlyArchive) {
  const { year } = archive;
  if (
    previousAt !== null &&
    previousAt >= new Date(`${year + 1}-01-01T00:00:00Z`)
  ) {
    log(`${year}: already stored`);
    return;
  }
  const name = archive.path.split("/").at(-1) ?? `${year}`;
  const file = join(cacheDir, name);
  log(`${year}: downloading ${name}`);
  await downloadToFile(archive, file);
  log(`${year}: replaying`);
  let lastTime: Date | null = null;
  await readArchive(file, async (entry, text) => {
    const time = parseEveRefSnapshotTime(entry);
    if (time === null) return;
    // The log must be written in time order; EVE Ref's old archives were not.
    if (lastTime !== null && time <= lastTime) {
      throw new Error(`${name}: ${entry} is out of time order`);
    }
    lastTime = time;
    await ingest(time, `${archive.path}#${entry}`, parseArchivedResponse(text));
  });
  log(`${year}: ${totals.snapshots} snapshots, ${totals.rows} rows so far`);
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
  // From where the archives (or the database) end, else the current year.
  const day = new Date(
    Math.max(
      dailyFrom?.getTime() ?? 0,
      previousAt?.getTime() ?? Date.UTC(new Date().getUTCFullYear(), 0, 1),
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

  const archives = (await listEveRefYearlyArchives()).filter(
    (archive) => archiveYears === "all" || archiveYears.has(archive.year),
  );
  log(`yearly archives: ${archives.map((archive) => archive.year).join(", ")}`);
  for (const archive of archives) {
    await replayArchive(archive);
    await flush();
  }
  if (dailyFrom === null || dailyFrom <= until) await replayDaily();
  await flush();

  if (options.cluster && !dryRun) {
    log("clustering SolarSystemCostIndex by its primary key");
    await prisma.$executeRaw`CLUSTER "SolarSystemCostIndex" USING "SolarSystemCostIndex_pkey"`;
    await prisma.$executeRaw`ANALYZE "SolarSystemCostIndex"`;
  }

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
