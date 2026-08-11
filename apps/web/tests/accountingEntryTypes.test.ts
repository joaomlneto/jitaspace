import { describe, expect, it } from "@jest/globals";

import {
  accountingEntryTypes,
  getAccountingEntryType,
  getAccountingEntryTypeName,
  humanizeRefType,
} from "../components/Wallet/accountingEntryTypes";

/**
 * The lookup table itself is generated (see
 * scripts/generate-accounting-entry-types.mjs), so these tests cover the
 * accessors around it plus a couple of anchor entries — a wrong ref_type ->
 * accountEntryTypeID mapping would silently mislabel every wallet journal row,
 * and that is exactly the kind of mistake generation can bake in.
 */
describe("accountingEntryTypes", () => {
  it("maps ref_types to the entry type EVE uses", () => {
    expect(getAccountingEntryType("brokers_fee")).toMatchObject({
      id: 46,
      name: "Brokers Fee",
    });
    expect(getAccountingEntryType("bounty_prizes")).toMatchObject({
      id: 85,
      name: "Bounty Prizes",
    });
    expect(getAccountingEntryType("transaction_tax")).toMatchObject({
      id: 54,
      name: "Transaction Tax",
      description: "Sales tax paid to the SCC for any transaction",
    });
  });

  it("returns nothing for a missing or unknown ref_type", () => {
    expect(getAccountingEntryType(undefined)).toBeUndefined();
    expect(getAccountingEntryType("not_a_ref_type")).toBeUndefined();
  });

  it("names every entry and keeps ids unique", () => {
    const entries = Object.values(accountingEntryTypes);
    expect(entries.length).toBeGreaterThan(150);
    expect(entries.every((entry) => entry.name.length > 0)).toBe(true);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
  });

  it("humanizes ref_types it does not know about", () => {
    expect(humanizeRefType("some_future_fee")).toBe("Some Future Fee");
    expect(getAccountingEntryTypeName("some_future_fee")).toBe(
      "Some Future Fee",
    );
  });

  it("has no name for an entry without a ref_type", () => {
    expect(getAccountingEntryTypeName(undefined)).toBe("");
  });
});
