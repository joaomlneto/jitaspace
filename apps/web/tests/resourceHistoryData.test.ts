/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as FileData from "~/app/file/[...path]/data";
import type * as StringData from "~/app/string/[stringId]/data";
import type * as BuildAxis from "~/lib/history-build-axis";

type Rows = Record<string, unknown>[];

const collectionFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const entityFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const changeFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const fileChangeFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const buildDiffFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const buildFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();

jest.mock("@jitaspace/db-history", () => ({
  historyDb: {
    collection: { findMany: (a?: unknown) => collectionFindMany(a) },
    entity: { findMany: (a?: unknown) => entityFindMany(a) },
    change: { findMany: (a?: unknown) => changeFindMany(a) },
    fileChange: { findMany: (a?: unknown) => fileChangeFindMany(a) },
    buildDiff: { findMany: (a?: unknown) => buildDiffFindMany(a) },
    build: { findMany: (a?: unknown) => buildFindMany(a) },
  },
}));

const { getCachedStringHistory } =
  require("~/app/string/[stringId]/data") as typeof StringData;
const { getCachedFileHistory } =
  require("~/app/file/[...path]/data") as typeof FileData;
const { readDiffBuilds } =
  require("~/lib/history-build-axis") as typeof BuildAxis;

beforeEach(() => {
  for (const mock of [
    collectionFindMany,
    entityFindMany,
    changeFindMany,
    fileChangeFindMany,
    buildDiffFindMany,
    buildFindMany,
  ])
    mock.mockReset().mockResolvedValue([]);

  buildDiffFindMany.mockResolvedValue([
    { id: 10, toBuild: 2_000_000 },
    { id: 11, toBuild: 2_100_000 },
    { id: 12, toBuild: 2_200_000 },
  ]);
  buildFindMany.mockResolvedValue([
    {
      buildNumber: 2_000_000,
      releasedAt: new Date("2024-01-02T10:00:00Z"),
      server: "tranquility",
    },
    {
      buildNumber: 2_100_000,
      releasedAt: new Date("2024-03-04T10:00:00Z"),
      server: "singularity",
    },
    // 2_200_000 has no Build row yet (mid-migration).
  ]);
});

describe("readDiffBuilds", () => {
  it("places each diff on its build, tolerating a missing build row", async () => {
    const builds = await readDiffBuilds([10, 12, 10, 99]);
    expect(buildDiffFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [10, 12, 99] } } }),
    );
    expect(builds.get(10)).toEqual({
      build: 2_000_000,
      date: "2024-01-02",
      server: "tranquility",
    });
    expect(builds.get(12)).toEqual({
      build: 2_200_000,
      date: null,
      server: null,
    });
    expect(builds.has(99)).toBe(false);
  });

  it("queries nothing for no diffs", async () => {
    expect((await readDiffBuilds([])).size).toBe(0);
    expect(buildDiffFindMany).not.toHaveBeenCalled();
  });
});

describe("getCachedStringHistory", () => {
  beforeEach(() => {
    collectionFindMany.mockResolvedValue([
      { id: 1, name: "strings:en-us" },
      { id: 2, name: "strings:zh" },
      { id: 3, name: "strings:de" },
    ]);
    entityFindMany.mockResolvedValue([{ id: 100 }, { id: 101 }]);
    changeFindMany.mockResolvedValue([
      {
        diffId: 11,
        collectionId: 2,
        op: "modified",
        data: { from: "旧", to: "新" },
      },
      { diffId: 10, collectionId: 1, op: "added", data: { to: "Hello" } },
      {
        diffId: 11,
        collectionId: 1,
        op: "modified",
        data: { from: "Hello", to: "Hello there" },
      },
      // Unplaceable: a diff with no row, and an unknown collection.
      { diffId: 99, collectionId: 1, op: "removed", data: { from: "x" } },
      { diffId: 10, collectionId: 42, op: "added", data: { to: "y" } },
    ]);
  });

  it("looks the string up per language through the (kind, eveId) index", async () => {
    await getCachedStringHistory(123);
    expect(entityFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          kind: { in: ["string:en-us", "string:zh", "string:de"] },
          eveId: 123,
        },
      }),
    );
    expect(changeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { entityId: { in: [100, 101] } } }),
    );
  });

  it("returns every language's events, oldest build and English first", async () => {
    expect(await getCachedStringHistory(123)).toEqual({
      stringId: 123,
      languages: ["en-us", "zh"],
      events: [
        {
          build: 2_000_000,
          date: "2024-01-02",
          server: "tranquility",
          lang: "en-us",
          op: "added",
          to: "Hello",
        },
        {
          build: 2_100_000,
          date: "2024-03-04",
          server: "singularity",
          lang: "en-us",
          op: "changed",
          from: "Hello",
          to: "Hello there",
        },
        {
          build: 2_100_000,
          date: "2024-03-04",
          server: "singularity",
          lang: "zh",
          op: "changed",
          from: "旧",
          to: "新",
        },
      ],
    });
  });

  it("is null when nothing about the string was recorded", async () => {
    entityFindMany.mockResolvedValue([]);
    expect(await getCachedStringHistory(1)).toBeNull();
    expect(changeFindMany).not.toHaveBeenCalled();

    collectionFindMany.mockResolvedValue([]);
    expect(await getCachedStringHistory(1)).toBeNull();
  });

  it("is null when no change can be placed on a build", async () => {
    changeFindMany.mockResolvedValue([
      { diffId: 99, collectionId: 1, op: "added", data: null },
    ]);
    expect(await getCachedStringHistory(1)).toBeNull();
  });

  it("lets a database failure propagate", async () => {
    changeFindMany.mockRejectedValue(new Error("connection lost"));
    await expect(getCachedStringHistory(1)).rejects.toThrow("connection lost");
  });
});

describe("getCachedFileHistory", () => {
  it("returns the Tranquility changes of the path, oldest first", async () => {
    fileChangeFindMany.mockResolvedValue([
      { diffId: 12, op: "removed", size: null, hash: null },
      { diffId: 10, op: "added", size: 2048n, hash: "abc" },
      { diffId: 11, op: "modified", size: 4096n, hash: "def" },
    ]);
    // 12 sits on a build with no row: no server, so not Tranquility's either.
    buildFindMany.mockResolvedValue([
      {
        buildNumber: 2_000_000,
        releasedAt: new Date("2024-01-02T00:00:00Z"),
        server: "tranquility",
      },
      {
        buildNumber: 2_100_000,
        releasedAt: null,
        server: "tranquility",
      },
    ]);

    expect(await getCachedFileHistory("res:/ui/a.png")).toEqual({
      path: "res:/ui/a.png",
      events: [
        {
          build: 2_000_000,
          date: "2024-01-02",
          op: "added",
          size: 2048,
          hash: "abc",
        },
        {
          build: 2_100_000,
          date: null,
          op: "modified",
          size: 4096,
          hash: "def",
        },
      ],
    });
    expect(fileChangeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { path: "res:/ui/a.png" } }),
    );
  });

  it("leaves out Singularity builds, and is null when nothing remains", async () => {
    fileChangeFindMany.mockResolvedValue([
      { diffId: 11, op: "modified", size: 1n, hash: "x" },
    ]);
    expect(await getCachedFileHistory("res:/x")).toBeNull();
  });

  it("is null for an unknown path", async () => {
    expect(await getCachedFileHistory("res:/nope")).toBeNull();
    expect(buildDiffFindMany).not.toHaveBeenCalled();
  });
});
