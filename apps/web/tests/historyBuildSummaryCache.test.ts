import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// `getCachedBuildSummary` is what puts the generated sentence on the build
// page's meta description. Its contract is `string | null` — callers use `??`
// to fall back to the generic wording, so returning "" for a blank row would
// defeat that fallback and ship an empty description.

type Row = { summary: string } | null;
const findUnique = jest.fn<(args?: unknown) => Promise<Row>>();

jest.mock("next/cache", () => ({ cacheLife: () => undefined }));
jest.mock("@jitaspace/db-history", () => ({ historyDb: {} }));
jest.mock("~/lib/db", () => ({
  prisma: { buildSummary: { findUnique: (a?: unknown) => findUnique(a) } },
}));

const { getCachedBuildSummary } =
  require("~/lib/history-cache") as typeof import("~/lib/history-cache");

beforeEach(() => {
  findUnique.mockReset();
});

describe("getCachedBuildSummary", () => {
  it("returns the stored sentence", async () => {
    findUnique.mockResolvedValue({ summary: "Adds four ships." });
    await expect(getCachedBuildSummary(3401877)).resolves.toBe(
      "Adds four ships.",
    );
  });

  it("trims surrounding whitespace", async () => {
    findUnique.mockResolvedValue({ summary: "  Adds four ships.  " });
    await expect(getCachedBuildSummary(3401877)).resolves.toBe(
      "Adds four ships.",
    );
  });

  it("returns null for a build with no summary row", async () => {
    findUnique.mockResolvedValue(null);
    await expect(getCachedBuildSummary(3401877)).resolves.toBeNull();
  });

  it("returns null — not an empty string — for a blank row", async () => {
    for (const blank of ["", "   ", "\n\t "]) {
      findUnique.mockResolvedValue({ summary: blank });
      await expect(getCachedBuildSummary(3401877)).resolves.toBeNull();
    }
  });

  it("returns null for a non-integer build without querying", async () => {
    await expect(getCachedBuildSummary(1.5)).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("swallows a query failure rather than failing the page", async () => {
    findUnique.mockRejectedValue(new Error("connection lost"));
    await expect(getCachedBuildSummary(3401877)).resolves.toBeNull();
  });
});
