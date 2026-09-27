import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { SdeRecord } from "@jitaspace/sde-utils";

import type { ingestSde as IngestSde } from "../jobs/scrape/sde/ingestSde";
import type * as SdeIngestStateModule from "../jobs/scrape/sde/sdeIngestState";

// A real directory so the drift check runs for real: it holds one file the
// stubbed registry knows and one it does not, which is the case that matters.
const sdeExtractDir = fs.mkdtempSync(path.join(os.tmpdir(), "sde-drift-"));
fs.writeFileSync(path.join(sdeExtractDir, "types.yaml"), "");
fs.writeFileSync(path.join(sdeExtractDir, "brandNewFile.yaml"), "");

// @swc/jest doesn't hoist jest.mock, so the mocks are declared first and the
// factories close over them; the job is imported lazily in beforeAll. The two
// recorder calls are stubbed to observe *when* they fire relative to the
// ingests — the ordering is what makes the `SdeIngest` marker trustworthy.
const loadSdeFile = jest.fn<(filename: string) => Promise<SdeRecord>>();
const recordSdeIngestStarted = jest.fn<(build: unknown) => Promise<void>>();
const recordSdeIngestCompleted = jest.fn<(build: number) => Promise<void>>();
const jobHandler = jest.fn<() => Promise<unknown>>();
// The id every `registry.get` is called with, in order. Counting handler calls
// is not enough: every job shares one stub, so a loop that ran the first id 102
// times would satisfy a count while ingesting nothing else.
const requestedJobIds: string[] = [];

// `ingest-sde-all` reads the registry to diff it against the extracted archive.
// The real barrel uses `.js` specifiers jest cannot resolve, so stub it with a
// registry chosen to produce drift in both directions against the fixture dir
// above: `brandNewFile.yaml` is present but unknown, `_sde.yaml` is known but
// absent.
jest.mock("@jitaspace/sde-utils", () => ({
  sdeInputFiles: { "types.yaml": {}, "_sde.yaml": {} },
}));
jest.mock("../helpers/loadSdeFile", () => ({
  loadSdeFile,
  sdeExtractRoot: () => Promise.resolve(sdeExtractDir),
}));
jest.mock("../jobs/scrape/sde/sdeIngestState", () => ({
  ...jest.requireActual<typeof SdeIngestStateModule>(
    "../jobs/scrape/sde/sdeIngestState",
  ),
  recordSdeIngestStarted,
  recordSdeIngestCompleted,
}));
jest.mock("../jobs", () => ({
  registry: {
    get: (jobId: string) => {
      requestedJobIds.push(jobId);
      return { handler: jobHandler };
    },
  },
}));

let ingestSde: typeof IngestSde;
let SDE_INGEST_JOB_IDS: string[];
let SDE_POST_ESI_JOB_IDS: string[];

beforeAll(async () => {
  ({ ingestSde, SDE_INGEST_JOB_IDS, SDE_POST_ESI_JOB_IDS } =
    await import("../jobs/scrape/sde/ingestSde"));
});

const BUILD_NUMBER = 3453885;

const ctx = () =>
  ({
    payload: {},
    attempt: 1,
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    send: jest.fn(),
    invoke: jest.fn(),
    run: jest.fn(),
    sleep: jest.fn(),
  }) as unknown as Parameters<typeof ingestSde.handler>[0];

beforeEach(() => {
  requestedJobIds.length = 0;
  loadSdeFile.mockResolvedValue({
    sde: { buildNumber: BUILD_NUMBER, releaseDate: "2026-07-31T11:29:31Z" },
  });
  recordSdeIngestStarted.mockResolvedValue(undefined);
  recordSdeIngestCompleted.mockResolvedValue(undefined);
  jobHandler.mockResolvedValue({});
});

describe("ingest-sde-all", () => {
  it("records the build it read from the archive's own metadata", async () => {
    await ingestSde.handler(ctx());

    expect(loadSdeFile).toHaveBeenCalledWith("_sde.yaml");
    // The release date rides along with the build number so anything showing
    // "SDE data as of ..." has a date rather than just an opaque build id.
    expect(recordSdeIngestStarted).toHaveBeenCalledWith({
      buildNumber: BUILD_NUMBER,
      releaseDate: "2026-07-31T11:29:31Z",
    });
  });

  it("claims the marker before the first ingest and completes it after the last", async () => {
    const order: string[] = [];
    recordSdeIngestStarted.mockImplementation(() => {
      order.push("started");
      return Promise.resolve();
    });
    jobHandler.mockImplementation(() => {
      order.push("ingest");
      return Promise.resolve({});
    });
    recordSdeIngestCompleted.mockImplementation(() => {
      order.push("completed");
      return Promise.resolve();
    });

    await ingestSde.handler(ctx());

    // The claim must bracket every ingest: it suppresses duplicate triggers from
    // the first moment, and only means "loaded" once the last one succeeded.
    expect(order[0]).toBe("started");
    expect(order.at(-1)).toBe("completed");
    // By identity and in order, not by count. The post-ESI hybrids run in the
    // same pass: leaving them out is how `scrape-sde-agents` became unreachable
    // from a new SDE build, and a count alone cannot tell that apart.
    expect(requestedJobIds).toEqual([
      ...SDE_INGEST_JOB_IDS,
      ...SDE_POST_ESI_JOB_IDS,
    ]);
    expect(order.filter((step) => step === "ingest")).toHaveLength(
      requestedJobIds.length,
    );
    expect(recordSdeIngestCompleted).toHaveBeenCalledWith(BUILD_NUMBER);
  });

  it("reports registry drift in both directions", async () => {
    const context = ctx();

    await ingestSde.handler(context);

    // Diagnostic only — it must warn, never throw, or a stale registry would
    // take down a 45-minute run over a file nobody reads yet.
    expect(context.logger.warn).toHaveBeenCalledWith("SDE registry drift", {
      // In the archive, missing from `sdeInputFiles`: the case that let CCP add
      // files this pipeline silently never ingested.
      unknown: ["brandNewFile.yaml"],
      // In `sdeInputFiles`, missing from the archive: a file CCP has withdrawn.
      absent: ["_sde.yaml"],
    });
  });

  it("leaves the ingest un-completed when a step fails", async () => {
    jobHandler.mockRejectedValueOnce(new Error("ingest-sde-types blew up"));

    await expect(ingestSde.handler(ctx())).rejects.toThrow("blew up");

    // `completedAt` stays null, so `watch-sde` retries this build once the claim
    // goes stale instead of believing it is loaded.
    expect(recordSdeIngestStarted).toHaveBeenCalled();
    expect(recordSdeIngestCompleted).not.toHaveBeenCalled();
  });

  it("does not claim anything when the archive metadata is unusable", async () => {
    loadSdeFile.mockResolvedValue({ sde: {} });

    await expect(ingestSde.handler(ctx())).rejects.toThrow("buildNumber");

    expect(recordSdeIngestStarted).not.toHaveBeenCalled();
  });
});
