import { describe, expect, it } from "@jest/globals";

import type { AuthenticatedContract } from "@jitaspace/hooks";

import type { ContractSummary } from "~/components/Contracts/contract";
import {
  contractHeadlineIsk,
  fromEsiContract,
  locationKind,
} from "~/components/Contracts/contract";
import {
  contractFiltersQuery,
  parseContractFilters,
} from "~/components/Contracts/filters";

const parse = (query: string) =>
  parseContractFilters(new URLSearchParams(query));

describe("parseContractFilters", () => {
  it("defaults every filter for an empty query", () => {
    expect(parse("")).toEqual({
      type: "all",
      regionId: null,
      q: "",
      minPrice: null,
      maxPrice: null,
      sort: "newest",
      page: 1,
    });
  });

  it("reads every filter", () => {
    expect(
      parse(
        "type=auction&region=10000002&q=%20raven%20&minPrice=1000000&maxPrice=2.5e9&sort=price-desc&page=3",
      ),
    ).toEqual({
      type: "auction",
      regionId: 10000002,
      q: "raven",
      minPrice: 1_000_000,
      maxPrice: 2_500_000_000,
      sort: "price-desc",
      page: 3,
    });
  });

  it("drops malformed values back to their defaults", () => {
    expect(
      parse("type=loan&region=0&minPrice=-1&maxPrice=abc&sort=random&page=0"),
    ).toEqual(parse(""));
    expect(parse("region=10000002.5&page=1e3")).toEqual(parse(""));
  });

  it("refuses ids and pages that cannot exist", () => {
    // Region ids are Postgres integers: a larger one would fail the query.
    expect(parse("region=2147483648").regionId).toBeNull();
    expect(parse("region=2147483647").regionId).toBe(2147483647);
    expect(parse("page=2000").page).toBe(2000);
    expect(parse("page=2001").page).toBe(1);
    expect(parse(`page=${"9".repeat(20)}`).page).toBe(1);
  });

  it("caps the search length", () => {
    expect(parse(`q=${"a".repeat(200)}`).q).toHaveLength(64);
  });

  it("round-trips through the query it builds, without defaults", () => {
    const filters = parse(
      "type=courier&region=10000043&q=dst&maxPrice=50000000&sort=expiring&page=2",
    );
    expect(parse(contractFiltersQuery(filters))).toEqual(filters);
    expect(contractFiltersQuery(parse(""))).toBe("");
  });
});

describe("locationKind", () => {
  it("tells stations from structures", () => {
    expect(locationKind(60003760)).toBe("station");
    expect(locationKind(1_035_466_617_946)).toBe("structure");
    expect(locationKind(30000142)).toBe("other");
  });
});

const esiContract = (
  overrides: Partial<AuthenticatedContract> = {},
): AuthenticatedContract => ({
  acceptor_id: 0,
  assignee_id: 0,
  availability: "public",
  contract_id: 42,
  date_expired: "2026-10-30T00:00:00Z",
  date_issued: "2026-10-16T00:00:00Z",
  for_corporation: false,
  issuer_corporation_id: 98000001,
  issuer_id: 90000001,
  status: "outstanding",
  type: "item_exchange",
  price: 1_000_000,
  reward: 0,
  collateral: 0,
  start_location_id: 60003760,
  end_location_id: 60003760,
  sources: [{ kind: "character", subjectId: 90000001 }],
  ...overrides,
});

describe("fromEsiContract", () => {
  it("normalises ESI's zeros and ids", () => {
    const summary = fromEsiContract(esiContract());
    expect(summary).toMatchObject({
      contractId: 42,
      type: "item_exchange",
      title: "",
      price: 1_000_000,
      reward: null,
      collateral: null,
      buyout: null,
      assigneeId: undefined,
      acceptorId: undefined,
      status: "outstanding",
      start: { locationId: 60003760, kind: "station" },
    });
  });

  it("keeps a structure as a structure", () => {
    const summary = fromEsiContract(
      esiContract({ start_location_id: 1_035_466_617_946 }),
    );
    expect(summary.start?.kind).toBe("structure");
  });
});

describe("contractHeadlineIsk", () => {
  const summary = (overrides: Partial<ContractSummary>): ContractSummary => ({
    ...fromEsiContract(esiContract()),
    ...overrides,
  });

  it("shows a courier's reward", () => {
    expect(
      contractHeadlineIsk(
        summary({ type: "courier", reward: 5e6, price: null }),
      ),
    ).toEqual({ label: "Reward", amount: 5e6 });
  });

  it("shows an auction's highest bid, or its starting price", () => {
    expect(
      contractHeadlineIsk(summary({ type: "auction", price: 1e6 })),
    ).toEqual({ label: "Starting bid", amount: 1e6 });
    expect(
      contractHeadlineIsk(
        summary({ type: "auction", price: 1e6, highestBid: 3e6 }),
      ),
    ).toEqual({ label: "Current bid", amount: 3e6 });
  });

  it("shows a want-to-buy exchange's reward", () => {
    expect(contractHeadlineIsk(summary({ price: null, reward: 2e6 }))).toEqual({
      label: "Reward",
      amount: 2e6,
    });
    expect(contractHeadlineIsk(summary({}))).toEqual({
      label: "Price",
      amount: 1_000_000,
    });
  });
});
