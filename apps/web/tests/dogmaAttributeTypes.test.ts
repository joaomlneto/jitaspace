/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { DogmaAttributeTypeRow } from "~/lib/dogmaAttributeTypes";
import { packTypeRows, unpackTypeRows } from "~/lib/dogmaAttributeTypes";

const typeAttributeFindMany =
  jest.fn<(args?: unknown) => Promise<Record<string, unknown>[]>>();
jest.mock("~/lib/db", () => ({
  prisma: {
    typeAttribute: { findMany: (a?: unknown) => typeAttributeFindMany(a) },
  },
}));

const ROWS: DogmaAttributeTypeRow[] = [
  {
    typeId: 587,
    name: "Rifter",
    published: true,
    groupId: 25,
    groupName: "Frigate",
    categoryId: 6,
    categoryName: "Ship",
    value: 1_067_000,
  },
  {
    typeId: 588,
    name: "Breacher",
    published: false,
    groupId: 25,
    groupName: "Frigate",
    categoryId: 6,
    categoryName: "Ship",
    value: 0,
  },
  {
    typeId: 3300,
    name: "Gunnery",
    published: true,
    groupId: 255,
    groupName: "Gunnery",
    categoryId: 16,
    categoryName: "Skill",
    value: 0.5,
  },
];

describe("packTypeRows / unpackTypeRows", () => {
  it("round-trips every field, zero values included", () => {
    expect(unpackTypeRows(packTypeRows(ROWS))).toEqual(ROWS);
  });

  it("names each group and category once", () => {
    const packed = packTypeRows(ROWS);
    expect(packed.groups).toEqual({ 25: ["Frigate", 6], 255: ["Gunnery", 16] });
    expect(packed.categories).toEqual({ 6: "Ship", 16: "Skill" });
    expect(packed.rows[1]).toEqual([588, "Breacher", 0, 25, 0]);
  });

  it("is far smaller than the rows written out as objects", () => {
    const many = Array.from({ length: 1000 }, (_, i) => ({
      ...ROWS[0]!,
      typeId: i,
    }));
    expect(JSON.stringify(packTypeRows(many)).length).toBeLessThan(
      JSON.stringify(many).length / 2,
    );
  });

  it("names a group or category it was not given by its id", () => {
    expect(
      unpackTypeRows({ groups: {}, categories: {}, rows: [[1, "X", 1, 9, 2]] }),
    ).toEqual([
      {
        typeId: 1,
        name: "X",
        published: true,
        groupId: 9,
        groupName: "Group 9",
        categoryId: 0,
        categoryName: "Category 0",
        value: 2,
      },
    ]);
  });
});

describe("GET /api/dogma/attribute/[attributeId]/types", () => {
  const call = async (attributeId: string) => {
    const { GET } =
      require("~/app/api/dogma/attribute/[attributeId]/types/route") as {
        GET: (
          r: Request,
          c: { params: Promise<{ attributeId: string }> },
        ) => Promise<Response>;
      };
    return GET(new Request("http://localhost/"), {
      params: Promise.resolve({ attributeId }),
    });
  };

  beforeEach(() => {
    typeAttributeFindMany.mockReset().mockResolvedValue([
      {
        value: 1_067_000,
        type: {
          typeId: 587,
          name: "Rifter",
          published: true,
          group: {
            groupId: 25,
            name: "Frigate",
            category: { categoryId: 6, name: "Ship" },
          },
        },
      },
    ]);
  });

  it("sends the packed rows with a day of CDN caching", async () => {
    const response = await call("4");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=86400");
    expect(unpackTypeRows(await response.json())).toEqual([
      {
        typeId: 587,
        name: "Rifter",
        published: true,
        groupId: 25,
        groupName: "Frigate",
        categoryId: 6,
        categoryName: "Ship",
        value: 1_067_000,
      },
    ]);
  });

  it("leaves out deleted rows and deleted types", async () => {
    await call("4");
    expect(typeAttributeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { attributeId: 4, isDeleted: false, type: { isDeleted: false } },
      }),
    );
  });

  it("rejects an id that is not a positive integer", async () => {
    for (const bad of ["0", "-1", "04", "x"]) {
      expect((await call(bad)).status).toBe(400);
    }
    expect(typeAttributeFindMany).not.toHaveBeenCalled();
  });
});
