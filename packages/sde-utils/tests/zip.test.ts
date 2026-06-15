import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  mkdir,
  sdeFolderChecksum,
  sdeZipChecksum,
  unzipSde,
} from "../src/zip";

// A small committed ZIP fixture containing:
//   a.txt        -> "alpha\n"
//   sub/         -> (directory entry)
//   sub/b.txt    -> "beta\n"
//   sub/c.txt    -> "gamma\n"
const FIXTURE_ZIP = path.resolve(__dirname, "fixtures/sample-sde.zip");
const FILE_ENTRY_COUNT = 3; // directory entries are not counted as files

describe("mkdir", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sde-mkdir-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("creates nested directories", () => {
    const nested = path.join(tmp, "a", "b", "c");
    mkdir(nested);
    expect(fs.existsSync(nested)).toBe(true);
  });

  it("is idempotent when the directory already exists", () => {
    const dir = path.join(tmp, "exists");
    mkdir(dir);
    expect(() => mkdir(dir)).not.toThrow();
    expect(fs.existsSync(dir)).toBe(true);
  });
});

describe("sdeZipChecksum", () => {
  it("returns a stable 32-char hex md5 digest", async () => {
    const checksum = await sdeZipChecksum(FIXTURE_ZIP);
    expect(checksum).toMatch(/^[0-9a-f]{32}$/);
  });

  it("is deterministic across calls", async () => {
    const a = await sdeZipChecksum(FIXTURE_ZIP);
    const b = await sdeZipChecksum(FIXTURE_ZIP);
    expect(a).toBe(b);
  });

  it("reports progress over file entries only (directories skipped)", async () => {
    const calls: [number, number][] = [];
    await sdeZipChecksum(FIXTURE_ZIP, (current, total) =>
      calls.push([current, total]),
    );
    expect(calls).toHaveLength(FILE_ENTRY_COUNT);
    // last call's `current` equals the number of files processed
    expect(calls.at(-1)?.[0]).toBe(FILE_ENTRY_COUNT);
  });
});

describe("unzipSde + sdeFolderChecksum", () => {
  let target: string;

  beforeEach(() => {
    target = fs.mkdtempSync(path.join(os.tmpdir(), "sde-unzip-"));
  });

  afterEach(() => {
    fs.rmSync(target, { recursive: true, force: true });
  });

  it("extracts every file with its original contents", async () => {
    await unzipSde(FIXTURE_ZIP, target);
    expect(fs.readFileSync(path.join(target, "a.txt"), "utf8")).toBe("alpha\n");
    expect(fs.readFileSync(path.join(target, "sub", "b.txt"), "utf8")).toBe(
      "beta\n",
    );
    expect(fs.readFileSync(path.join(target, "sub", "c.txt"), "utf8")).toBe(
      "gamma\n",
    );
  });

  it("creates nested directories present in the archive", async () => {
    await unzipSde(FIXTURE_ZIP, target);
    expect(fs.statSync(path.join(target, "sub")).isDirectory()).toBe(true);
  });

  it("invokes the progress callback once per extracted file", async () => {
    const calls: [number, number][] = [];
    await unzipSde(FIXTURE_ZIP, target, (current, total) =>
      calls.push([current, total]),
    );
    expect(calls).toHaveLength(FILE_ENTRY_COUNT);
    expect(calls.at(-1)?.[0]).toBe(FILE_ENTRY_COUNT);
  });

  it("produces a folder checksum equal to the zip checksum (round-trip)", async () => {
    await unzipSde(FIXTURE_ZIP, target);
    const zipChecksum = await sdeZipChecksum(FIXTURE_ZIP);
    const folderChecksum = await sdeFolderChecksum(FIXTURE_ZIP, target);
    expect(folderChecksum).toBe(zipChecksum);
  });

  it("reports progress while checksumming the extracted folder", async () => {
    await unzipSde(FIXTURE_ZIP, target);
    const progress = jest.fn();
    await sdeFolderChecksum(FIXTURE_ZIP, target, progress);
    expect(progress).toHaveBeenCalledTimes(FILE_ENTRY_COUNT);
  });
});
