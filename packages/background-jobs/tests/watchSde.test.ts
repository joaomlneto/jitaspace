import { beforeAll, describe, expect, it, jest } from "@jest/globals";

import type { SdeBuild } from "@jitaspace/sde-utils";

import type * as SdeIngestStateModule from "../jobs/scrape/sde/sdeIngestState";
import type { SdeIngestState } from "../jobs/scrape/sde/sdeIngestState";
import type { watchSde as WatchSde } from "../jobs/scrape/sde/watchSde";

// @swc/jest doesn't hoist jest.mock, so these mock fns are declared first and the
// factories close over them; the job is imported lazily in beforeAll (after the
// mocks register). The real @jitaspace/sde-utils barrel also won't resolve under
// jest, so it must be mocked regardless. `coversSdeBuild` is left real — it is
// the staleness rule under test here.
const latestSdeBuild = jest.fn<() => Promise<SdeBuild>>();
const loadedSdeBuild = jest.fn<() => Promise<SdeIngestState | null>>();

jest.mock("@jitaspace/sde-utils", () => ({ latestSdeBuild }));
jest.mock("../jobs/scrape/sde/sdeIngestState", () => ({
  ...jest.requireActual<typeof SdeIngestStateModule>(
    "../jobs/scrape/sde/sdeIngestState",
  ),
  loadedSdeBuild,
}));

let watchSde: typeof WatchSde;

beforeAll(async () => {
  ({ watchSde } = await import("../jobs/scrape/sde/watchSde"));
});

const BUILD_NUMBER = 3453885;
const HOUR_MS = 3600 * 1000;

/** Stored ingest state for `buildNumber`, claimed `startedMsAgo` ago. */
const ingestState = (
  buildNumber: number,
  {
    completed,
    startedMsAgo = 0,
  }: { completed: boolean; startedMsAgo?: number },
): SdeIngestState => ({
  buildNumber,
  startedAt: Date.now() - startedMsAgo,
  completedAt: completed ? Date.now() - startedMsAgo + 60_000 : null,
});

const run = (ingested: SdeIngestState | null) => {
  latestSdeBuild.mockResolvedValue({
    buildNumber: BUILD_NUMBER,
    releaseDate: "2026-07-31T11:29:31Z",
  });
  loadedSdeBuild.mockResolvedValue(ingested);
  const send = jest.fn<(id: string, payload: unknown) => Promise<void>>(() =>
    Promise.resolve(),
  );
  const ctx = {
    payload: {},
    attempt: 1,
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    send,
    invoke: jest.fn(),
    run: jest.fn(),
    sleep: jest.fn(),
  } as unknown as Parameters<typeof watchSde.handler>[0];
  return { result: watchSde.handler(ctx), send };
};

describe("watch-sde", () => {
  it("triggers ingest-sde-all when nothing has been ingested yet", async () => {
    const { result, send } = run(null);
    await expect(result).resolves.toMatchObject({
      changed: true,
      buildNumber: BUILD_NUMBER,
    });
    expect(send).toHaveBeenCalledWith("ingest-sde-all", {});
  });

  it("triggers ingest-sde-all when the recorded build is older", async () => {
    const { result, send } = run(
      ingestState(BUILD_NUMBER - 1, { completed: true }),
    );
    await expect(result).resolves.toMatchObject({ changed: true });
    expect(send).toHaveBeenCalledWith("ingest-sde-all", {});
  });

  it("does nothing when this build was already ingested", async () => {
    const { result, send } = run(
      ingestState(BUILD_NUMBER, { completed: true }),
    );
    await expect(result).resolves.toMatchObject({ changed: false });
    expect(send).not.toHaveBeenCalled();
  });

  it("does not re-trigger while an ingest for this build is in flight", async () => {
    // Claimed 10 minutes ago and not finished: `ingest-sde-all` is still running,
    // so firing again would queue a redundant hour-long run.
    const { result, send } = run(
      ingestState(BUILD_NUMBER, {
        completed: false,
        startedMsAgo: 10 * 60_000,
      }),
    );
    await expect(result).resolves.toMatchObject({ changed: false });
    expect(send).not.toHaveBeenCalled();
  });

  it("retries an ingest that claimed this build but never finished", async () => {
    // Past `ingest-sde-all`'s own max duration with no completion: that run is
    // dead, and without this the build would never be ingested.
    const { result, send } = run(
      ingestState(BUILD_NUMBER, {
        completed: false,
        startedMsAgo: 2 * HOUR_MS,
      }),
    );
    await expect(result).resolves.toMatchObject({ changed: true });
    expect(send).toHaveBeenCalledWith("ingest-sde-all", {});
  });
});
