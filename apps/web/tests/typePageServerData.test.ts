/**
 * Tests for the server-side data loading in app/type/[typeId]/page.tsx.
 *
 * `getTypeData` is not exported, so it is driven through its two callers:
 *  - `generateMetadata`, which surfaces the type name, the HTML-stripped
 *    description and the OpenGraph image URL;
 *  - the default `Page`, whose `PageContent` child returns the client component
 *    element carrying the full `PageProps` — including the dogma attribute
 *    reference metadata that used to be fetched one attribute (and one unit,
 *    and one category) at a time from the now removed SDE API client.
 */

import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { PageProps } from "~/app/type/[typeId]/page.client";

// ---------------------------------------------------------------------------
// Module mocks. `next/cache` is stubbed globally (moduleNameMapper), so the
// `"use cache"` directive on getTypeData is inert here.
// ---------------------------------------------------------------------------

// The client component pulls in the whole Mantine / hooks dependency chain.
jest.mock("~/app/type/[typeId]/page.client", () => ({ default: () => null }));
jest.mock("@mantine/core", () => new Proxy({}, { get: () => () => null }));

// notFound() throws in Next.js — reproduce that so PageContent's not-found
// branch is observable from a test.
jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const mockTypeFindUniqueOrThrow =
  jest.fn<(...a: unknown[]) => Promise<unknown>>();
const mockTypeAttributeFindMany =
  jest.fn<(...a: unknown[]) => Promise<unknown>>();
const mockCategoryFindMany = jest.fn<(...a: unknown[]) => Promise<unknown>>();

jest.mock("~/lib/db", () => ({
  prisma: {
    type: {
      findUniqueOrThrow: (...a: unknown[]) => mockTypeFindUniqueOrThrow(...a),
    },
    typeAttribute: {
      findMany: (...a: unknown[]) => mockTypeAttributeFindMany(...a),
    },
    dogmaAttributeCategory: {
      findMany: (...a: unknown[]) => mockCategoryFindMany(...a),
    },
  },
}));

// images.evetech.net variation listing
const mockFetch = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const originalFetch = global.fetch;
global.fetch = mockFetch as unknown as typeof fetch;
afterAll(() => {
  global.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// Fixtures / helpers
// ---------------------------------------------------------------------------

const RIFTER_TYPE_ID = 587;

interface DogmaUnitRow {
  displayName: string | null;
  name: string | null;
}

interface AttributeRow {
  attributeId: number;
  attribute: {
    name: string | null;
    displayName: string | null;
    iconId: number | null;
    unitId: number | null;
    attributeCategoryId: number | null;
    DogmaUnit: DogmaUnitRow | null;
  };
}

function attributeRow(
  attributeId: number,
  overrides: Partial<AttributeRow["attribute"]> = {},
): AttributeRow {
  return {
    attributeId,
    attribute: {
      name: `attribute${attributeId}`,
      displayName: `Attribute ${attributeId}`,
      iconId: null,
      unitId: null,
      attributeCategoryId: null,
      DogmaUnit: null,
      ...overrides,
    },
  };
}

/** Response shape of GET https://images.evetech.net/types/{typeId}. */
function variationsResponse(variations: string[]) {
  return { status: 200, json: () => Promise.resolve(variations) };
}

/** The image service 404s for types that have no image at all. */
function imageNotFoundResponse() {
  return {
    status: 404,
    json: () => Promise.reject(new Error("json() must not be called on a 404")),
  };
}

async function loadMetadata(typeId: string) {
  const { generateMetadata } = await import("~/app/type/[typeId]/page");
  return generateMetadata({ params: Promise.resolve({ typeId }) });
}

/**
 * Invokes the page's async `PageContent` child (the only consumer of the full
 * `getTypeData` result) and returns the props it hands to the client component.
 */
async function loadPageProps(typeId: string): Promise<PageProps> {
  const { default: Page } = await import("~/app/type/[typeId]/page");
  const tree = Page({ params: Promise.resolve({ typeId }) }) as unknown as {
    props: {
      children: {
        type: (props: unknown) => Promise<{ props: PageProps }>;
        props: unknown;
      };
    };
  };
  const content = tree.props.children;
  const rendered = await content.type(content.props);
  return rendered.props;
}

beforeEach(() => {
  jest.resetModules();
  mockTypeFindUniqueOrThrow.mockReset();
  mockTypeAttributeFindMany.mockReset();
  mockCategoryFindMany.mockReset();
  mockFetch.mockReset();

  // Defaults — individual tests override whichever part they exercise.
  mockTypeFindUniqueOrThrow.mockResolvedValue({
    typeId: RIFTER_TYPE_ID,
    name: "Rifter",
    description: "A <b>versatile</b> Minmatar frigate.",
  });
  mockTypeAttributeFindMany.mockResolvedValue([]);
  mockCategoryFindMany.mockResolvedValue([]);
  mockFetch.mockResolvedValue(variationsResponse(["icon", "render"]));
});

// ---------------------------------------------------------------------------
// generateMetadata
// ---------------------------------------------------------------------------

describe("type/[typeId] generateMetadata", () => {
  it("returns the type name, stripped description and OG image", async () => {
    const result = await loadMetadata(String(RIFTER_TYPE_ID));

    expect(mockFetch).toHaveBeenCalledWith(
      "https://images.evetech.net/types/587",
    );
    expect(result.title).toBe("Rifter");
    expect(result.description).toBe("A versatile Minmatar frigate.");
    expect(result.openGraph?.title).toBe("Rifter");
    expect(result.openGraph?.description).toBe("A versatile Minmatar frigate.");
    expect(result.openGraph?.images).toEqual([
      {
        url: "https://images.evetech.net/types/587/icon",
        width: 64,
        height: 64,
      },
    ]);
    expect(result.twitter?.title).toBe("Rifter");
    expect(result.twitter?.images).toEqual([
      "https://images.evetech.net/types/587/icon",
    ]);
  });

  it("uses the first image variation when there is no icon variation", async () => {
    mockFetch.mockResolvedValue(variationsResponse(["render", "bp"]));

    const result = await loadMetadata(String(RIFTER_TYPE_ID));

    expect(result.openGraph?.images).toEqual([
      {
        url: "https://images.evetech.net/types/587/render",
        width: 64,
        height: 64,
      },
    ]);
  });

  it("has no variation segment when the image service returns 404", async () => {
    mockFetch.mockResolvedValue(imageNotFoundResponse());

    const result = await loadMetadata(String(RIFTER_TYPE_ID));

    // No variations came back, so the URL carries no usable variation.
    expect(result.twitter?.images).toEqual([
      "https://images.evetech.net/types/587/undefined",
    ]);
  });

  it("omits the description when the type has none", async () => {
    mockTypeFindUniqueOrThrow.mockResolvedValue({
      typeId: RIFTER_TYPE_ID,
      name: "Rifter",
      description: null,
    });

    const result = await loadMetadata(String(RIFTER_TYPE_ID));

    expect(result.title).toBe("Rifter");
    expect(result.description).toBeUndefined();
    expect(result.openGraph?.description).toBeUndefined();
  });

  it("omits the title when the type has no name", async () => {
    mockTypeFindUniqueOrThrow.mockResolvedValue({
      typeId: RIFTER_TYPE_ID,
      name: null,
      description: "A nameless thing.",
    });

    const result = await loadMetadata(String(RIFTER_TYPE_ID));

    expect(result.title).toBeUndefined();
    expect(result.openGraph?.title).toBeUndefined();
    expect(result.twitter?.title).toBeUndefined();
    // The description and image are still produced.
    expect(result.description).toBe("A nameless thing.");
  });

  it("truncates long descriptions to 200 characters", async () => {
    mockTypeFindUniqueOrThrow.mockResolvedValue({
      typeId: RIFTER_TYPE_ID,
      name: "Rifter",
      description: `<b>${"x".repeat(300)}</b>`,
    });

    const result = await loadMetadata(String(RIFTER_TYPE_ID));

    expect(result.description).toBe("x".repeat(200));
  });

  it("returns empty metadata for a typeId of 0", async () => {
    const result = await loadMetadata("0");

    expect(result).toEqual({});
    expect(mockTypeFindUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("returns empty metadata for a non-numeric typeId", async () => {
    const result = await loadMetadata("rifter");

    expect(result).toEqual({});
    expect(mockTypeFindUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("returns empty metadata when the type does not exist", async () => {
    // findUniqueOrThrow rejects for unknown IDs.
    mockTypeFindUniqueOrThrow.mockRejectedValue(new Error("No Type found"));

    expect(await loadMetadata(String(RIFTER_TYPE_ID))).toEqual({});
  });

  it("returns empty metadata when the attribute query throws", async () => {
    mockTypeAttributeFindMany.mockRejectedValue(new Error("db"));

    expect(await loadMetadata(String(RIFTER_TYPE_ID))).toEqual({});
  });

  it("returns empty metadata when the image request fails", async () => {
    mockFetch.mockRejectedValue(new Error("network"));

    expect(await loadMetadata(String(RIFTER_TYPE_ID))).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Dogma attribute reference metadata (observable via the page's client props)
// ---------------------------------------------------------------------------

describe("type/[typeId] dogma attribute metadata", () => {
  it("assembles unit symbols and category names for each attribute", async () => {
    mockTypeAttributeFindMany.mockResolvedValue([
      attributeRow(4, {
        name: "mass",
        displayName: "Mass",
        iconId: 1389,
        unitId: 2,
        attributeCategoryId: 4,
        DogmaUnit: { displayName: "kg", name: "Kilogram" },
      }),
      attributeRow(9, {
        name: "hp",
        displayName: "Structure Hitpoints",
        iconId: 1401,
        unitId: 1,
        attributeCategoryId: 7,
        DogmaUnit: { displayName: "HP", name: "Hitpoints" },
      }),
    ]);
    mockCategoryFindMany.mockResolvedValue([
      { attributeCategoryId: 4, name: "Fitting" },
      { attributeCategoryId: 7, name: "Structure" },
    ]);

    const props = await loadPageProps(String(RIFTER_TYPE_ID));

    expect(props.dogmaAttributeMeta).toEqual([
      {
        attributeId: 4,
        name: "mass",
        displayName: "Mass",
        iconId: 1389,
        unitId: 2,
        unitSymbol: "kg",
        categoryId: 4,
        categoryName: "Fitting",
      },
      {
        attributeId: 9,
        name: "hp",
        displayName: "Structure Hitpoints",
        iconId: 1401,
        unitId: 1,
        unitSymbol: "HP",
        categoryId: 7,
        categoryName: "Structure",
      },
    ]);
  });

  it("falls back from the unit display name to its name, then to null", async () => {
    mockTypeAttributeFindMany.mockResolvedValue([
      attributeRow(1, {
        DogmaUnit: { displayName: "m3", name: "Cubic Metre" },
      }),
      attributeRow(2, {
        DogmaUnit: { displayName: null, name: "Cubic Metre" },
      }),
      attributeRow(3, { DogmaUnit: { displayName: null, name: null } }),
      attributeRow(4, { DogmaUnit: null }),
    ]);

    const props = await loadPageProps(String(RIFTER_TYPE_ID));

    expect(props.dogmaAttributeMeta.map((meta) => meta.unitSymbol)).toEqual([
      "m3",
      "Cubic Metre",
      null,
      null,
    ]);
  });

  it("leaves the category name null when the attribute has no category", async () => {
    mockTypeAttributeFindMany.mockResolvedValue([
      attributeRow(4, { attributeCategoryId: null }),
    ]);
    mockCategoryFindMany.mockResolvedValue([
      { attributeCategoryId: 4, name: "Fitting" },
    ]);

    const props = await loadPageProps(String(RIFTER_TYPE_ID));

    // The category id must not be used as a lookup key when it is null.
    expect(props.dogmaAttributeMeta[0]?.categoryId).toBeNull();
    expect(props.dogmaAttributeMeta[0]?.categoryName).toBeNull();
  });

  it("leaves the category name null when no category row matched", async () => {
    mockTypeAttributeFindMany.mockResolvedValue([
      attributeRow(4, { attributeCategoryId: 99 }),
    ]);
    mockCategoryFindMany.mockResolvedValue([]);

    const props = await loadPageProps(String(RIFTER_TYPE_ID));

    expect(props.dogmaAttributeMeta[0]?.categoryId).toBe(99);
    expect(props.dogmaAttributeMeta[0]?.categoryName).toBeNull();
  });

  it("looks up categories once, with de-duplicated non-null ids", async () => {
    mockTypeAttributeFindMany.mockResolvedValue([
      attributeRow(1, { attributeCategoryId: 4 }),
      attributeRow(2, { attributeCategoryId: 7 }),
      attributeRow(3, { attributeCategoryId: 4 }),
      attributeRow(4, { attributeCategoryId: null }),
      attributeRow(5, { attributeCategoryId: 7 }),
    ]);
    mockCategoryFindMany.mockResolvedValue([
      { attributeCategoryId: 4, name: "Fitting" },
      { attributeCategoryId: 7, name: "Structure" },
    ]);

    const props = await loadPageProps(String(RIFTER_TYPE_ID));

    expect(mockCategoryFindMany).toHaveBeenCalledTimes(1);
    const categoryQuery = mockCategoryFindMany.mock.calls[0]?.[0] as {
      where: { attributeCategoryId: { in: number[] } };
    };
    expect(categoryQuery.where.attributeCategoryId.in).toEqual([4, 7]);
    expect(props.dogmaAttributeMeta.map((meta) => meta.categoryName)).toEqual([
      "Fitting",
      "Structure",
      "Fitting",
      null,
      "Structure",
    ]);
  });

  it("returns no attribute metadata when the type has no attributes", async () => {
    mockTypeAttributeFindMany.mockResolvedValue([]);

    const props = await loadPageProps(String(RIFTER_TYPE_ID));

    expect(props.dogmaAttributeMeta).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Page content props
// ---------------------------------------------------------------------------

describe("type/[typeId] page content", () => {
  it("passes the loaded type through to the client component", async () => {
    const props = await loadPageProps(String(RIFTER_TYPE_ID));

    expect(props.typeId).toBe(RIFTER_TYPE_ID);
    expect(props.typeName).toBe("Rifter");
    // The raw (unstripped) description is handed to the client component.
    expect(props.typeDescription).toBe("A <b>versatile</b> Minmatar frigate.");
    expect(props.ogImageUrl).toBe("https://images.evetech.net/types/587/icon");

    // The string route param is queried as a number.
    expect(mockTypeFindUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { typeId: RIFTER_TYPE_ID } }),
    );
    expect(mockTypeAttributeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { typeId: RIFTER_TYPE_ID },
        orderBy: { attributeId: "asc" },
      }),
    );
  });

  it("triggers notFound when the type cannot be loaded", async () => {
    mockTypeFindUniqueOrThrow.mockRejectedValue(new Error("No Type found"));

    await expect(loadPageProps(String(RIFTER_TYPE_ID))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("triggers notFound for an invalid typeId without querying", async () => {
    await expect(loadPageProps("0")).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockTypeFindUniqueOrThrow).not.toHaveBeenCalled();
  });
});
