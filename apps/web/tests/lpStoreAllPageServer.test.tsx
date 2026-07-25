import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// ---------------------------------------------------------------------------
// The LP Store "all offers" route's page.tsx is an async Server Component: it
// loads the whole LoyaltyStoreOffer + LoyaltyStoreOfferRequiredItem tables via
// Prisma, groups the required items onto their owning offer in Node, then hands
// the result to the presentational page.client. These tests exercise that
// server-side join/trim logic directly — mock the Prisma singleton, await the
// component, and inspect the props it forwards (no rendering needed).
//
// jest.mock is NOT hoisted by the SWC (next/jest) transform, so the mocks are
// declared first and the module under test is pulled in with a lazy require()
// inside each test, after the mocks are in place. Mock fns are `mock`-prefixed
// so they may be referenced from the jest.mock factory closures.
// ---------------------------------------------------------------------------

// Prisma query methods resolve asynchronously; typing the mocks this way lets
// `mockResolvedValue`/`mockRejectedValue` accept our fixtures (an untyped
// jest.fn() infers a `never` value parameter) while keeping `.mock.calls`
// indexable for the type-id assertion.
type QueryMock = (...args: unknown[]) => Promise<unknown>;

const mockOfferGroupBy = jest.fn<QueryMock>();
const mockOfferFindMany = jest.fn<QueryMock>();
const mockCorporationFindMany = jest.fn<QueryMock>();
const mockRequiredItemFindMany = jest.fn<QueryMock>();
const mockTypeFindMany = jest.fn<QueryMock>();
const mockNotFound = jest.fn();

jest.mock("~/lib/db", () => ({
  prisma: {
    loyaltyStoreOffer: {
      groupBy: mockOfferGroupBy,
      findMany: mockOfferFindMany,
    },
    corporation: { findMany: mockCorporationFindMany },
    loyaltyStoreOfferRequiredItem: { findMany: mockRequiredItemFindMany },
    type: { findMany: mockTypeFindMany },
  },
}));

jest.mock("next/navigation", () => ({ notFound: mockNotFound }));

// Stub the presentational client so importing the page doesn't pull in the
// heavy LoyaltyPointsTable subtree; we only inspect the props it receives.
jest.mock("~/app/lp-store/all/page.client", () => ({
  __esModule: true,
  default: () => null,
}));

const CORPORATIONS = [
  { corporationId: 1000035, name: "Caldari Navy" },
  { corporationId: 1000125, name: "Federation Navy" },
];

const TYPES = [
  { typeId: 34, name: "Tritanium" },
  { typeId: 2929, name: "Caldari Navy Antimatter Charge S" },
];

// Two offers share offerId 1 across different corporations — the join key must
// use BOTH offerId and corporationId or their required items cross-contaminate.
const OFFERS = [
  {
    offerId: 1,
    corporationId: 1000035,
    typeId: 2929,
    quantity: 1,
    akCost: null,
    lpCost: 1500n,
    iskCost: 5_000_000n,
  },
  {
    offerId: 2,
    corporationId: 1000035,
    typeId: 3000,
    quantity: 5,
    akCost: 2,
    lpCost: 250n,
    iskCost: 0n,
  },
  {
    offerId: 1,
    corporationId: 1000125,
    typeId: 4000,
    quantity: 1,
    akCost: null,
    lpCost: 100n,
    iskCost: 10n,
  },
];

const REQUIRED_ITEMS = [
  // offer (1, 1000035) has two required items -> exercises both Map branches
  // (create-new-group, then push-onto-existing-group).
  { offerId: 1, corporationId: 1000035, typeId: 34, quantity: 10 },
  { offerId: 1, corporationId: 1000035, typeId: 35, quantity: 20 },
  // Belongs to the OTHER corp's offer 1 -> must not leak into (1, 1000035).
  { offerId: 1, corporationId: 1000125, typeId: 36, quantity: 1 },
  // offer (2, 1000035) intentionally has none -> exercises the `?? []` fallback.
];

interface ForwardedProps {
  corporations: unknown;
  types: unknown;
  offers: {
    offerId: number;
    corporationId: number;
    iskCost: number;
    lpCost: number;
    requiredItems: { typeId: number; quantity: number }[];
  }[];
}

function loadPage() {
  return require("~/app/lp-store/all/page").default as () => Promise<{
    props: ForwardedProps;
  }>;
}

const findOffer = (
  props: ForwardedProps,
  offerId: number,
  corporationId: number,
) =>
  props.offers.find(
    (offer) =>
      offer.offerId === offerId && offer.corporationId === corporationId,
  )!;

describe("LP Store all-offers page (server component)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOfferGroupBy.mockResolvedValue([
      { corporationId: 1000035 },
      { corporationId: 1000125 },
    ]);
    mockCorporationFindMany.mockResolvedValue(CORPORATIONS);
    mockOfferFindMany.mockResolvedValue(OFFERS);
    mockRequiredItemFindMany.mockResolvedValue(REQUIRED_ITEMS);
    mockTypeFindMany.mockResolvedValue(TYPES);
  });

  it("groups each offer's required items by its composite [offerId, corporationId] key", async () => {
    const { props } = await loadPage()();

    expect(findOffer(props, 1, 1000035).requiredItems).toEqual([
      { typeId: 34, quantity: 10 },
      { typeId: 35, quantity: 20 },
    ]);
    // Same offerId, different corporation — no cross-contamination.
    expect(findOffer(props, 1, 1000125).requiredItems).toEqual([
      { typeId: 36, quantity: 1 },
    ]);
    // Offer with no required items gets an empty array (the `?? []` fallback).
    expect(findOffer(props, 2, 1000035).requiredItems).toEqual([]);
  });

  it("trims required items to { typeId, quantity }, dropping the join-only fields", async () => {
    const { props } = await loadPage()();
    const item = findOffer(props, 1, 1000035).requiredItems[0]!;

    expect(item).not.toHaveProperty("offerId");
    expect(item).not.toHaveProperty("corporationId");
    expect(Object.keys(item).sort()).toEqual(["quantity", "typeId"]);
  });

  it("converts the BigInt isk/lp costs to numbers", async () => {
    const { props } = await loadPage()();
    const offer = findOffer(props, 1, 1000035);

    expect(typeof offer.iskCost).toBe("number");
    expect(typeof offer.lpCost).toBe("number");
    expect(offer.iskCost).toBe(5_000_000);
    expect(offer.lpCost).toBe(1500);
  });

  it("prices both reward and required item types (queries the union of type ids)", async () => {
    await loadPage()();

    expect(mockTypeFindMany).toHaveBeenCalledTimes(1);
    const arg = mockTypeFindMany.mock.calls[0]![0] as {
      where: { typeId: { in: number[] } };
    };
    expect([...arg.where.typeId.in].sort((a, b) => a - b)).toEqual([
      34, 35, 36, 2929, 3000, 4000,
    ]);
  });

  it("forwards the resolved corporations and types unchanged", async () => {
    const { props } = await loadPage()();

    expect(props.corporations).toBe(CORPORATIONS);
    expect(props.types).toBe(TYPES);
  });

  it("falls back to notFound() with empty data when a query fails", async () => {
    mockOfferGroupBy.mockRejectedValueOnce(new Error("db down"));

    const { props } = await loadPage()();

    expect(mockNotFound).toHaveBeenCalledTimes(1);
    expect(props.corporations).toEqual([]);
    expect(props.offers).toEqual([]);
    expect(props.types).toEqual([]);
  });
});
