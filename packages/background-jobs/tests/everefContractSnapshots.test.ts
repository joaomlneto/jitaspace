import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "@jest/globals";

import type { SnapshotData } from "../helpers/everefContractSnapshots";
import {
  contractRowFromSnapshot,
  dynamicOfSnapshot,
  itemFromSnapshot,
  listingsOfSnapshot,
  parseCsv,
  parseScrapeTime,
  readSnapshotDir,
} from "../helpers/everefContractSnapshots";

// Rows as EVE Ref's 2026-11-03 21:30:05 snapshot has them (CRLF, quoted).
const CONTRACTS_CSV = [
  "collateral,contract_id,date_expired,date_issued,days_to_complete,end_location_id,issuer_corporation_id,issuer_id,price,reward,start_location_id,title,type,volume,http_last_modified,region_id,station_id,system_id,constellation_id,for_corporation,buyout",
  "0.0,236769860,2026-11-03T21:12:34Z,2026-10-06T21:12:34Z,0,60003760,1000168,96544417,650000000.0,0.0,60003760,,item_exchange,50.0,2026-11-03T21:08:12Z,10000002,60003760,30000142,20000020,,",
  '0.0,237552154,2026-11-05T21:08:12Z,2026-10-28T00:00:00Z,0,1035466617946,1000046,2113550182,1000000.0,0.0,1035466617946,"Gila, ""fit""",auction,0.06,2026-11-03T21:08:12Z,10000002,,,,true,0.0',
  "30000000.0,237453254,2026-11-22T18:11:52Z,2026-10-25T18:11:52Z,2,60012250,98013162,1366299497,0.0,1000000.0,60003760,Gila,courier,20000.0,2026-11-03T21:08:17Z,10000043,60003760,30000142,20000020,,",
].join("\r\n");

describe("parseCsv", () => {
  it("reads quoted fields, doubled quotes, commas in quotes and CRLF", () => {
    const rows = parseCsv(CONTRACTS_CSV);
    expect(rows).toHaveLength(3);
    expect(rows[1]).toMatchObject({
      contract_id: "237552154",
      title: 'Gila, "fit"',
      buyout: "0.0",
    });
    // No stray carriage return on the last column.
    expect(rows[0]?.buyout).toBe("");
  });

  it("keeps a last line with no newline and drops malformed rows", () => {
    expect(parseCsv("a,b\n1,2\n3\n4,5")).toEqual([
      { a: "1", b: "2" },
      { a: "4", b: "5" },
    ]);
    expect(parseCsv("")).toEqual([]);
  });

  it("keeps newlines inside quotes", () => {
    expect(parseCsv('a,b\n"x\ny",z\n')).toEqual([{ a: "x\ny", b: "z" }]);
  });
});

describe("parseScrapeTime", () => {
  it("reads both meta.json formats", () => {
    expect(parseScrapeTime("2026-11-03T21:30:05Z")).toBe(
      Date.UTC(2026, 10, 3, 21, 30, 5),
    );
    expect(parseScrapeTime("1667062802.000000000")).toBe(1667062802000);
    expect(parseScrapeTime(1667062802)).toBe(1667062802000);
    expect(parseScrapeTime("garbage")).toBeNull();
    expect(parseScrapeTime(undefined)).toBeNull();
  });
});

describe("contractRowFromSnapshot", () => {
  const [itemExchange, auction] = parseCsv(CONTRACTS_CSV);

  it("stores a contract as the snapshot ingest did", () => {
    expect(contractRowFromSnapshot(itemExchange!)).toEqual({
      contractId: 236769860,
      type: "ItemExchange",
      issuerId: 96544417,
      issuerCorporationId: 1000168,
      forCorporation: false,
      title: "",
      dateIssued: new Date("2026-10-06T21:12:34Z"),
      dateExpired: new Date("2026-11-03T21:12:34Z"),
      daysToComplete: 0,
      volume: 50,
      startLocationId: 60003760n,
      endLocationId: 60003760n,
      regionId: 10000002,
      solarSystemId: 30000142,
      stationId: 60003760,
      price: 650000000,
      reward: 0,
      collateral: 0,
      buyout: null,
    });
  });

  it("leaves station and system null in a structure, and a zero buyout null", () => {
    expect(contractRowFromSnapshot(auction!)).toMatchObject({
      type: "Auction",
      forCorporation: true,
      stationId: null,
      solarSystemId: null,
      buyout: null,
    });
  });

  it("drops a structure ID that one snapshot put in station_id", () => {
    expect(
      contractRowFromSnapshot({ ...itemExchange!, station_id: "1035466617946" })
        .stationId,
    ).toBeNull();
  });

  it("stores a type it does not know as Unknown", () => {
    expect(
      contractRowFromSnapshot({ ...itemExchange!, type: "barter" }).type,
    ).toBe("Unknown");
  });
});

describe("itemFromSnapshot", () => {
  it("gives an item ESI's shape, leaving out what the row leaves empty", () => {
    expect(
      itemFromSnapshot({
        is_blueprint_copy: "",
        is_included: "true",
        item_id: "1055642326389",
        material_efficiency: "",
        quantity: "1",
        record_id: "5336997384",
        runs: "",
        time_efficiency: "",
        type_id: "47793",
      }),
    ).toEqual({
      record_id: 5336997384,
      type_id: 47793,
      quantity: 1,
      is_included: true,
      item_id: 1055642326389,
    });
    expect(
      itemFromSnapshot({
        is_blueprint_copy: "true",
        is_included: "false",
        item_id: "",
        material_efficiency: "10",
        quantity: "1",
        record_id: "1",
        runs: "50",
        time_efficiency: "20",
        type_id: "1",
      }),
    ).toEqual({
      record_id: 1,
      type_id: 1,
      quantity: 1,
      is_included: false,
      is_blueprint_copy: true,
      material_efficiency: 10,
      time_efficiency: 20,
      runs: 50,
    });
  });
});

const empty: SnapshotData = {
  scrapeStart: Date.UTC(2026, 10, 3, 21, 30, 5),
  contracts: [],
  items: [],
  bids: [],
  dynamic: [],
  dynAttrs: [],
  dynEffects: [],
};

describe("listingsOfSnapshot", () => {
  const scrape = empty.scrapeStart!;

  it("keys each region by the Last-Modified EVE Ref recorded for it", () => {
    const listings = listingsOfSnapshot(
      { ...empty, contracts: parseCsv(CONTRACTS_CSV) },
      scrape,
      [],
    );
    expect(
      listings.map((l) => [
        l.regionId,
        l.observedAt,
        l.contracts.map((c) => c.contractId),
      ]),
    ).toEqual([
      [10000002, Date.UTC(2026, 10, 3, 21, 8, 12), [236769860, 237552154]],
      [10000043, Date.UTC(2026, 10, 3, 21, 8, 17), [237453254]],
    ]);
  });

  it("falls back to the scrape time when a region has none, or several", () => {
    const [a, b] = parseCsv(CONTRACTS_CSV);
    const listings = listingsOfSnapshot(
      {
        ...empty,
        contracts: [
          { ...a!, http_last_modified: "" },
          { ...b!, http_last_modified: "2026-11-03T21:38:12Z" },
        ],
      },
      scrape,
      [],
    );
    expect(listings[0]?.observedAt).toBe(scrape);
  });

  it("observes regions the timeline knows as empty when the snapshot lists none there", () => {
    const listings = listingsOfSnapshot(empty, scrape, [10000001]);
    expect(listings).toEqual([
      { regionId: 10000001, observedAt: scrape, contracts: [] },
    ]);
  });
});

describe("dynamicOfSnapshot", () => {
  it("gathers each mutated item's rolls once, however many contracts list it", () => {
    const dynamic = dynamicOfSnapshot({
      ...empty,
      dynamic: [
        {
          created_by: "94837614",
          mutator_type_id: "47735",
          source_type_id: "15891",
          item_id: "1027864596928",
          contract_id: "1",
        },
        {
          created_by: "94837614",
          mutator_type_id: "47735",
          source_type_id: "15891",
          item_id: "1027864596928",
          contract_id: "2",
        },
      ],
      dynAttrs: ["1", "2"].map((contract_id) => ({
        attribute_id: "4",
        value: "0.0",
        contract_id,
        item_id: "1027864596928",
      })),
      dynEffects: ["1", "2"].map((contract_id) => ({
        effect_id: "13",
        is_default: "false",
        contract_id,
        item_id: "1027864596928",
      })),
    });
    expect(dynamic).toEqual(
      new Map([
        [
          1027864596928,
          {
            created_by: 94837614,
            source_type_id: 15891,
            mutator_type_id: 47735,
            dogma_attributes: [{ attribute_id: 4, value: 0 }],
            dogma_effects: [{ effect_id: 13, is_default: false }],
          },
        ],
      ]),
    );
  });
});

describe("readSnapshotDir", () => {
  it("reads an extracted snapshot, missing files as empty", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "everef-test-"));
    try {
      fs.writeFileSync(path.join(dir, "contracts.csv"), CONTRACTS_CSV);
      fs.writeFileSync(
        path.join(dir, "meta.json"),
        JSON.stringify({ scrape_start: "2026-11-03T21:30:05Z" }),
      );
      const data = readSnapshotDir(dir);
      expect(data.scrapeStart).toBe(Date.UTC(2026, 10, 3, 21, 30, 5));
      expect(data.contracts).toHaveLength(3);
      expect(data.items).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
