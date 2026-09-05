import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { latestSdeBuild, sdeFolderBuild, sdeZipBuild } from "../src/build";
import {
  SDE_BUILD_NUMBER_HEADER,
  SDE_LATEST_BUILD_URL,
} from "../src/constants";

// Mini SDE archive: `_sde.yaml` (build 3453885) + `agentTypes.yaml`.
const FIXTURE_ZIP = path.resolve(__dirname, "fixtures/sde-with-metadata.zip");
// Committed archive with no `_sde.yaml` at all.
const FIXTURE_ZIP_WITHOUT_METADATA = path.resolve(
  __dirname,
  "fixtures/sample-sde.zip",
);
const FIXTURE_BUILD_NUMBER = 3453885;

const jsonResponse = (body: string, init?: ResponseInit) =>
  new Response(body, init);

const redirectResponse = (headers: Record<string, string>) =>
  new Response(null, { status: 302, headers });

// `restoreMocks: true` in jest.config puts the real fetch back after each test.
const mockFetch = () => jest.spyOn(globalThis, "fetch");

describe("latestSdeBuild", () => {
  it("reads the build number off the archive's redirect", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce(
      redirectResponse({ [SDE_BUILD_NUMBER_HEADER]: "3453885" }),
    );

    await expect(latestSdeBuild()).resolves.toEqual({ buildNumber: 3453885 });
    // The header alone answers the question — no second request.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "HEAD",
      // The header rides on the 302, so the redirect must not be followed.
      redirect: "manual",
    });
  });

  it("falls back to the index when the archive omits the header", async () => {
    const fetchMock = mockFetch();
    fetchMock
      .mockResolvedValueOnce(redirectResponse({}))
      .mockResolvedValueOnce(
        jsonResponse(
          '{"_key": "sde", "buildNumber": 3453885, "releaseDate": "2026-07-31T11:29:31Z"}\n',
        ),
      );

    await expect(latestSdeBuild()).resolves.toEqual({
      buildNumber: 3453885,
      releaseDate: "2026-07-31T11:29:31Z",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(SDE_LATEST_BUILD_URL);
  });

  it("falls back to the index when the HEAD request fails outright", async () => {
    const fetchMock = mockFetch();
    fetchMock
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(jsonResponse('{"buildNumber": 42}'));

    await expect(latestSdeBuild()).resolves.toEqual({ buildNumber: 42 });
  });

  it("skips blank and unrelated lines in the index", async () => {
    const fetchMock = mockFetch();
    fetchMock
      .mockResolvedValueOnce(redirectResponse({}))
      .mockResolvedValueOnce(
        jsonResponse(
          '\nnot json\n{"_key": "other"}\n{"_key": "sde", "buildNumber": 7}\n',
        ),
      );

    await expect(latestSdeBuild()).resolves.toEqual({ buildNumber: 7 });
  });

  it("throws when the index request fails", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce(redirectResponse({})).mockResolvedValueOnce(
      jsonResponse("nope", {
        status: 503,
        statusText: "Service Unavailable",
      }),
    );

    await expect(latestSdeBuild()).rejects.toThrow("503");
  });

  it("throws when the index carries no build number", async () => {
    const fetchMock = mockFetch();
    fetchMock
      .mockResolvedValueOnce(redirectResponse({}))
      .mockResolvedValueOnce(jsonResponse('{"_key": "sde"}\n'));

    await expect(latestSdeBuild()).rejects.toThrow("no build number");
  });

  it("ignores a non-numeric build number header", async () => {
    const fetchMock = mockFetch();
    fetchMock
      .mockResolvedValueOnce(
        redirectResponse({ [SDE_BUILD_NUMBER_HEADER]: "not-a-number" }),
      )
      .mockResolvedValueOnce(jsonResponse('{"buildNumber": 5}'));

    await expect(latestSdeBuild()).resolves.toEqual({ buildNumber: 5 });
  });
});

describe("sdeZipBuild", () => {
  it("reads the build out of an archive without extracting it", async () => {
    await expect(sdeZipBuild(FIXTURE_ZIP)).resolves.toEqual({
      buildNumber: FIXTURE_BUILD_NUMBER,
      releaseDate: "2026-07-31T11:29:31Z",
    });
  });

  it("returns null for an archive without `_sde.yaml`", async () => {
    await expect(sdeZipBuild(FIXTURE_ZIP_WITHOUT_METADATA)).resolves.toBeNull();
  });

  it("returns null when the archive does not exist", async () => {
    await expect(sdeZipBuild("/nonexistent/sde.zip")).resolves.toBeNull();
  });

  it("returns null for a file that is not a ZIP", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sde-build-"));
    try {
      const notAZip = path.join(tmp, "sde.zip");
      fs.writeFileSync(notAZip, "definitely not a zip");
      await expect(sdeZipBuild(notAZip)).resolves.toBeNull();
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("sdeFolderBuild", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sde-folder-build-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const writeMetadata = (contents: string) =>
    fs.writeFileSync(path.join(tmp, "_sde.yaml"), contents);

  it("reads the build out of an extracted folder", () => {
    writeMetadata(
      "sde:\n  buildNumber: 3453885\n  releaseDate: '2026-07-31'\n",
    );
    expect(sdeFolderBuild(tmp)).toEqual({
      buildNumber: 3453885,
      releaseDate: "2026-07-31",
    });
  });

  it("omits the release date when the metadata has none", () => {
    writeMetadata("sde:\n  buildNumber: 3453885\n");
    expect(sdeFolderBuild(tmp)).toEqual({ buildNumber: 3453885 });
  });

  it("returns null when `_sde.yaml` is missing", () => {
    expect(sdeFolderBuild(tmp)).toBeNull();
  });

  it("returns null when the folder itself does not exist", () => {
    expect(sdeFolderBuild(path.join(tmp, "nope"))).toBeNull();
  });

  it("returns null when the metadata is not valid YAML", () => {
    writeMetadata("sde:\n\tbuildNumber: [unclosed\n");
    expect(sdeFolderBuild(tmp)).toBeNull();
  });

  it("returns null when the build number is missing or not a number", () => {
    writeMetadata("sde:\n  releaseDate: '2026-07-31'\n");
    expect(sdeFolderBuild(tmp)).toBeNull();

    writeMetadata("sde:\n  buildNumber: 'latest'\n");
    expect(sdeFolderBuild(tmp)).toBeNull();
  });
});
