import { describe, expect, it } from "@jest/globals";

import type { EsiPublicContract } from "../helpers/publicContracts";
import {
  BIDS_HOT_WINDOW_MS,
  contractRowFromEsi,
  contractTypeOf,
  RUN_INTERVAL_MS,
  selectAuctionsForBids,
} from "../helpers/publicContracts";

// Shapes captured from ESI on 2026-11-03.
const courier: EsiPublicContract = {
  collateral: 30000000.0,
  contract_id: 237453254,
  date_expired: "2026-11-22T18:11:52Z",
  date_issued: "2026-10-25T18:11:52Z",
  days_to_complete: 2,
  end_location_id: 60012250,
  issuer_corporation_id: 98013162,
  issuer_id: 1366299497,
  price: 0.0,
  reward: 1000000.0,
  start_location_id: 60003760,
  title: "Gila",
  type: "courier",
  volume: 20000.0,
};
const auctionInStructure: EsiPublicContract = {
  buyout: 0,
  contract_id: 237552154,
  date_expired: "2026-11-05T21:08:12Z",
  date_issued: "2026-10-28T00:00:00Z",
  days_to_complete: 0,
  end_location_id: 1035466617946,
  for_corporation: true,
  issuer_corporation_id: 1000046,
  issuer_id: 2113550182,
  price: 1000000.0,
  reward: 0.0,
  start_location_id: 1035466617946,
  type: "auction",
  volume: 0.06,
};

describe("contractRowFromEsi", () => {
  it("stores a contract in an NPC station with its solar system", () => {
    const row = contractRowFromEsi(
      courier,
      10000002,
      new Map([[60003760, 30000142]]),
    );
    expect(row).toEqual({
      contractId: 237453254,
      type: "Courier",
      issuerId: 1366299497,
      issuerCorporationId: 98013162,
      forCorporation: false,
      title: "Gila",
      dateIssued: new Date("2026-10-25T18:11:52Z"),
      dateExpired: new Date("2026-11-22T18:11:52Z"),
      daysToComplete: 2,
      volume: 20000,
      startLocationId: 60003760n,
      endLocationId: 60012250n,
      regionId: 10000002,
      solarSystemId: 30000142,
      stationId: 60003760,
      price: 0,
      reward: 1000000,
      collateral: 30000000,
      buyout: null,
    });
  });

  it("leaves station and system null for a contract in a player structure", () => {
    const row = contractRowFromEsi(auctionInStructure, 10000002, new Map());
    expect(row).toMatchObject({
      type: "Auction",
      forCorporation: true,
      title: "",
      startLocationId: 1035466617946n,
      stationId: null,
      solarSystemId: null,
      regionId: 10000002,
      // ESI's 0 means "no buyout".
      buyout: null,
    });
  });
});

describe("contractTypeOf", () => {
  it("stores a type ESI adds later as Unknown", () => {
    expect(contractTypeOf({ type: "loan" })).toBe("Loan");
    expect(
      contractTypeOf({ type: "barter" as EsiPublicContract["type"] }),
    ).toBe("Unknown");
  });
});

describe("selectAuctionsForBids", () => {
  const now = 1000 * RUN_INTERVAL_MS;
  const later = now + 3 * BIDS_HOT_WINDOW_MS;

  it("picks new auctions and those close to expiry every run", () => {
    // Contract IDs that are never in the cold rotation's slot this run.
    const auctions = [
      { contractId: 13, dateExpired: now + BIDS_HOT_WINDOW_MS },
      { contractId: 25, dateExpired: later },
      { contractId: 37, dateExpired: later },
    ];
    expect(selectAuctionsForBids(auctions, new Set([37]), now)).toEqual([
      13, 37,
    ]);
  });

  it("refreshes every other auction once every 12 runs", () => {
    const auctions = Array.from({ length: 120 }, (_, i) => ({
      contractId: 5000 + i,
      dateExpired: later,
    }));
    const picked = new Map<number, number>();
    for (let run = 0; run < 12; run++) {
      for (const id of selectAuctionsForBids(
        auctions,
        new Set(),
        now + run * RUN_INTERVAL_MS,
      )) {
        picked.set(id, (picked.get(id) ?? 0) + 1);
      }
    }
    expect(picked.size).toBe(120);
    expect([...picked.values()].every((n) => n === 1)).toBe(true);
  });

  it("picks the same auctions when retried within the same half hour", () => {
    const auctions = Array.from({ length: 50 }, (_, i) => ({
      contractId: 9000 + i,
      dateExpired: later,
    }));
    expect(selectAuctionsForBids(auctions, new Set(), now + 60_000)).toEqual(
      selectAuctionsForBids(auctions, new Set(), now + 20 * 60_000),
    );
  });
});
