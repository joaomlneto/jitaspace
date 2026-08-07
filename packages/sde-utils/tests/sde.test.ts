import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type * as BuildModule from "../src/build";
import type { SdeBuild } from "../src/build";
import type { ensureSdePresentAndExtracted as EnsureSdePresentAndExtracted } from "../src/sde";

// Mini SDE archive: `_sde.yaml` (build 3453885) + `agentTypes.yaml`.
const FIXTURE_ZIP = path.resolve(__dirname, "fixtures/sde-with-metadata.zip");
const FIXTURE_BUILD_NUMBER = 3453885;

// @swc/jest doesn't hoist jest.mock, so the mock fns are declared first and the
// factories close over them; the module under test is imported lazily in
// beforeAll. Only the network reaches for a mock — the zip/folder inspection,
// extraction and filesystem work all run for real against the fixture.
const latestSdeBuild = jest.fn<() => Promise<SdeBuild>>();
const downloadFile =
  jest.fn<
    (
      url: string,
      destination: string,
      filename: string,
      onProgress?: (bytesReceived: number, totalBytes: number) => void,
    ) => Promise<void>
  >();

jest.mock("../src/build", () => ({
  ...jest.requireActual<typeof BuildModule>("../src/build"),
  latestSdeBuild,
}));
jest.mock("../src/download", () => ({ downloadFile }));

let ensureSdePresentAndExtracted: typeof EnsureSdePresentAndExtracted;

beforeAll(async () => {
  ({ ensureSdePresentAndExtracted } = await import("../src/sde"));
});

describe("ensureSdePresentAndExtracted", () => {
  let workDir: string;
  let logs: string[];

  const sdeRoot = () => path.join(workDir, "sde");
  const archivePath = () => path.join(workDir, "sde.zip");
  const run = () =>
    ensureSdePresentAndExtracted(workDir, { onLog: (m) => logs.push(m) });

  /** Stand in for a download of the published archive. */
  const placeFixtureArchive = () => fs.copyFileSync(FIXTURE_ZIP, archivePath());

  /** An extracted folder claiming `buildNumber`. */
  const placeExtractedFolder = (buildNumber: number) => {
    fs.mkdirSync(sdeRoot(), { recursive: true });
    fs.writeFileSync(
      path.join(sdeRoot(), "_sde.yaml"),
      `sde:\n  buildNumber: ${buildNumber}\n`,
    );
  };

  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), "sde-ensure-"));
    logs = [];
    latestSdeBuild.mockResolvedValue({ buildNumber: FIXTURE_BUILD_NUMBER });
    downloadFile.mockImplementation(
      (_url, _destination, _filename, onProgress) => {
        placeFixtureArchive();
        onProgress?.(
          fs.statSync(archivePath()).size,
          fs.statSync(archivePath()).size,
        );
        return Promise.resolve();
      },
    );
  });

  afterEach(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  it("downloads and extracts when nothing is cached", async () => {
    await run();

    expect(downloadFile).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(path.join(sdeRoot(), "agentTypes.yaml"))).toBe(true);
  });

  it("reuses an extracted folder already on the published build", async () => {
    placeExtractedFolder(FIXTURE_BUILD_NUMBER);

    await run();

    expect(downloadFile).not.toHaveBeenCalled();
    expect(logs.join("")).toContain("up to date");
  });

  it("reuses a cached archive already on the published build", async () => {
    placeFixtureArchive();

    await run();

    // The whole point: a cached archive on the current build is not re-fetched.
    expect(downloadFile).not.toHaveBeenCalled();
    expect(fs.existsSync(path.join(sdeRoot(), "agentTypes.yaml"))).toBe(true);
  });

  it("re-downloads when the cached archive is on an older build", async () => {
    placeFixtureArchive();
    latestSdeBuild.mockResolvedValue({
      buildNumber: FIXTURE_BUILD_NUMBER + 1,
    });

    await run();

    expect(downloadFile).toHaveBeenCalledTimes(1);
  });

  it("re-downloads when the cached archive has no readable metadata", async () => {
    fs.writeFileSync(archivePath(), "truncated download");

    await run();

    expect(downloadFile).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(path.join(sdeRoot(), "agentTypes.yaml"))).toBe(true);
  });

  it("replaces an extracted folder left on an older build", async () => {
    placeExtractedFolder(FIXTURE_BUILD_NUMBER - 1);
    // A file that exists in the stale build but not in the published one.
    const removedInNewBuild = path.join(sdeRoot(), "retiredTypes.yaml");
    fs.writeFileSync(removedInNewBuild, "1: {}\n");

    await run();

    expect(downloadFile).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(path.join(sdeRoot(), "agentTypes.yaml"))).toBe(true);
    // Stale files must not survive, or they'd be parsed as current data.
    expect(fs.existsSync(removedInNewBuild)).toBe(false);
  });

  it("replaces an extracted folder with unreadable metadata", async () => {
    fs.mkdirSync(sdeRoot(), { recursive: true });
    fs.writeFileSync(path.join(sdeRoot(), "types.yaml"), "1: {}\n");

    await run();

    expect(downloadFile).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(path.join(sdeRoot(), "_sde.yaml"))).toBe(true);
  });

  it("forwards download and extraction progress to the caller", async () => {
    const onDownloadProgress = jest.fn();
    const onExtractProgress = jest.fn();

    await ensureSdePresentAndExtracted(workDir, {
      onDownloadProgress,
      onExtractProgress,
      onLog: () => undefined,
    });

    expect(onDownloadProgress).toHaveBeenCalled();
    expect(onExtractProgress).toHaveBeenCalled();
  });

  it("defaults to console.log when no logger is supplied", async () => {
    const consoleLog = jest
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    await ensureSdePresentAndExtracted(workDir);

    expect(consoleLog).toHaveBeenCalled();
  });
});
