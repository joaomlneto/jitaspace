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

// @swc/jest doesn't hoist jest.mock, so the mocks are declared first and the
// factories close over them; the job is imported lazily in beforeAll. The two
// recorder calls are stubbed to observe *when* they fire relative to the
// ingests — the ordering is what makes the `SdeIngest` marker trustworthy.
const loadSdeFile = jest.fn<(filename: string) => Promise<SdeRecord>>();
const recordSdeIngestStarted = jest.fn<(build: unknown) => Promise<void>>();
const recordSdeIngestCompleted = jest.fn<(build: number) => Promise<void>>();
const jobHandler = jest.fn<() => Promise<unknown>>();

jest.mock("../helpers/loadSdeFile", () => ({ loadSdeFile }));
jest.mock("../jobs/scrape/sde/sdeIngestState", () => ({
  ...jest.requireActual<typeof SdeIngestStateModule>(
    "../jobs/scrape/sde/sdeIngestState",
  ),
  recordSdeIngestStarted,
  recordSdeIngestCompleted,
}));
jest.mock("../jobs", () => ({
  registry: { get: () => ({ handler: jobHandler }) },
}));

let ingestSde: typeof IngestSde;
let SDE_INGEST_JOB_IDS: string[];

beforeAll(async () => {
  ({ ingestSde, SDE_INGEST_JOB_IDS } =
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
    expect(recordSdeIngestStarted).toHaveBeenCalledWith({
      buildNumber: BUILD_NUMBER,
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
    expect(order.filter((step) => step === "ingest")).toHaveLength(
      SDE_INGEST_JOB_IDS.length,
    );
    expect(recordSdeIngestCompleted).toHaveBeenCalledWith(BUILD_NUMBER);
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
