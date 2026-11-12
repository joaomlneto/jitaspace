import { describe, expect, it } from "@jest/globals";

import type { AuthenticatedContract } from "@jitaspace/hooks";

import type { ContractSummary } from "~/components/Contracts/contract";
import {
  contractHeadlineIsk,
  fromEsiContract,
  locationKind,
} from "~/components/Contracts/contract";

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
