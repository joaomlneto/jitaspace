import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { scrapeEsiLoyaltyStoreOffers as ScrapeEsiLoyaltyStoreOffers } from "../jobs/scrape/esi/scrapeEsiLoyaltyStoreOffers";

// @swc/jest doesn't hoist jest.mock, so the mock fns are declared first and the
// factories close over them; the job is imported lazily in beforeAll. ESI,
// Prisma, p-limit (ESM-only) and the reference helper are stubbed; updateTable
// and compareSets run for real, since what is under test is which rows the
// diff's deletions end up marking.
jest.mock("p-limit", () => ({
  __esModule: true,
  default: () => (fn: () => unknown) => fn(),
}));

interface EsiOffer {
  offer_id: number;
  type_id: number;
  quantity: number;
  isk_cost: number;
  lp_cost: number;
  ak_cost?: number;
  required_items: { type_id: number; quantity: number }[];
}

interface OfferRow {
  offerId: number;
  corporationId: number;
  typeId: number;
  quantity: number;
  akCost: number | null;
  iskCost: bigint;
  lpCost: bigint;
  isDeleted: boolean;
}

interface RequiredItemRow {
  offerId: number;
  corporationId: number;
  typeId: number;
  quantity: number;
  isDeleted: boolean;
}

let esiOffers: Map<number, EsiOffer[]>;
let offerRows: OfferRow[];
let requiredItemRows: RequiredItemRow[];

const getLoyaltyStoresCorporationIdOffers = jest.fn((corporationId: number) =>
  Promise.resolve({ data: esiOffers.get(corporationId) ?? [] }),
);
const getCorporationsNpccorps = jest.fn(() =>
  Promise.resolve({ data: [...esiOffers.keys()] }),
);

const prisma = {
  loyaltyStoreOffer: {
    findMany: jest.fn(() => Promise.resolve(offerRows)),
    createMany: jest.fn(() => Promise.resolve({ count: 0 })),
    update: jest.fn((_args: unknown) => Promise.resolve({})),
    updateMany: jest.fn(() => Promise.resolve({ count: 0 })),
  },
  loyaltyStoreOfferRequiredItem: {
    findMany: jest.fn(() => Promise.resolve(requiredItemRows)),
    createMany: jest.fn(() => Promise.resolve({ count: 0 })),
    update: jest.fn((_args: unknown) => Promise.resolve({})),
    updateMany: jest.fn(() => Promise.resolve({ count: 0 })),
  },
};

jest.mock("@jitaspace/esi-client", () => ({
  getCorporationsNpccorps,
  getLoyaltyStoresCorporationIdOffers,
}));
jest.mock("../db", () => ({ prisma }));
jest.mock("../helpers/createCorpAndItsRefs.ts", () => ({
  createCorpAndItsRefRecords: jest.fn(() => Promise.resolve(undefined)),
}));

let scrapeEsiLoyaltyStoreOffers: typeof ScrapeEsiLoyaltyStoreOffers;

beforeAll(async () => {
  ({ scrapeEsiLoyaltyStoreOffers } =
    await import("../jobs/scrape/esi/scrapeEsiLoyaltyStoreOffers"));
});

const STATE_PROTECTORATE = 1000180;
const CALDARI_NAVY = 1000035;
const ANTIMATTER_L = 3561;
const TRITANIUM = 34;

const esiOffer = (offerId: number): EsiOffer => ({
  offer_id: offerId,
  type_id: 20000 + offerId,
  quantity: 5000,
  isk_cost: 2_400_000,
  lp_cost: 2400,
  required_items: [{ type_id: TRITANIUM, quantity: 10 }],
});

/** The row a scrape of {@link esiOffer} would have stored for a store. */
const offerRow = (
  offerId: number,
  corporationId: number,
  isDeleted = false,
): OfferRow => ({
  offerId,
  corporationId,
  typeId: 20000 + offerId,
  quantity: 5000,
  akCost: null,
  iskCost: 2_400_000n,
  lpCost: 2400n,
  isDeleted,
});

const requiredItemRow = (
  offerId: number,
  corporationId: number,
  isDeleted = false,
): RequiredItemRow => ({
  offerId,
  corporationId,
  typeId: TRITANIUM,
  quantity: 10,
  isDeleted,
});

const run = () =>
  scrapeEsiLoyaltyStoreOffers.handler({
    payload: {},
    run: (_name: string, fn: () => unknown) => fn(),
  } as unknown as Parameters<typeof scrapeEsiLoyaltyStoreOffers.handler>[0]);

/** The `where` of the single `updateMany` that marked rows deleted. */
const deletionWhere = (model: keyof typeof prisma) => {
  const { calls } = prisma[model].updateMany.mock;
  expect(calls).toHaveLength(1);
  return (calls[0] as unknown as [{ where: unknown }])[0].where;
};

beforeEach(() => {
  jest.clearAllMocks();
  // Both stores sell the offer, under the same offer id, as on Tranquility;
  // only the State Protectorate withdrew it.
  esiOffers = new Map([
    [STATE_PROTECTORATE, []],
    [CALDARI_NAVY, [esiOffer(ANTIMATTER_L)]],
  ]);
  offerRows = [
    offerRow(ANTIMATTER_L, STATE_PROTECTORATE),
    offerRow(ANTIMATTER_L, CALDARI_NAVY),
  ];
  requiredItemRows = [
    requiredItemRow(ANTIMATTER_L, STATE_PROTECTORATE),
    requiredItemRow(ANTIMATTER_L, CALDARI_NAVY),
  ];
});

describe("scrapeEsiLoyaltyStoreOffers", () => {
  it("marks a withdrawn offer deleted only in the store that withdrew it", async () => {
    const result = (await run()) as { loyaltyStoreOfferChanges: unknown };

    expect(result.loyaltyStoreOfferChanges).toEqual(
      expect.objectContaining({ deleted: 1, equal: 1 }),
    );
    expect(deletionWhere("loyaltyStoreOffer")).toEqual({
      OR: [{ offerId: ANTIMATTER_L, corporationId: STATE_PROTECTORATE }],
    });
    expect(deletionWhere("loyaltyStoreOfferRequiredItem")).toEqual({
      OR: [
        {
          offerId: ANTIMATTER_L,
          corporationId: STATE_PROTECTORATE,
          typeId: TRITANIUM,
        },
      ],
    });
  });

  it("leaves rows already marked deleted alone, so they keep the run that saw them go", async () => {
    offerRows[0] = offerRow(ANTIMATTER_L, STATE_PROTECTORATE, true);
    requiredItemRows[0] = requiredItemRow(
      ANTIMATTER_L,
      STATE_PROTECTORATE,
      true,
    );

    await run();

    expect(prisma.loyaltyStoreOffer.updateMany).not.toHaveBeenCalled();
    expect(
      prisma.loyaltyStoreOfferRequiredItem.updateMany,
    ).not.toHaveBeenCalled();
  });

  it("restores an offer CCP puts back on sale", async () => {
    esiOffers.set(STATE_PROTECTORATE, [esiOffer(ANTIMATTER_L)]);
    offerRows[0] = offerRow(ANTIMATTER_L, STATE_PROTECTORATE, true);

    await run();

    expect(prisma.loyaltyStoreOffer.update).toHaveBeenCalledWith({
      data: offerRow(ANTIMATTER_L, STATE_PROTECTORATE),
      where: {
        offerId_corporationId: {
          offerId: ANTIMATTER_L,
          corporationId: STATE_PROTECTORATE,
        },
      },
    });
  });
});
