import { describe, expect, it } from "@jest/globals";

import { getEnabledApps } from "~/components/Menu/appAccess";
import { corporationApps } from "~/config/apps";

const getEnabledCorporationApps = (
  scopes: Parameters<typeof getEnabledApps>[1],
) => {
  return getEnabledApps(corporationApps, scopes);
};

describe("getEnabledCorporationApps", () => {
  it("returns apps available with granted corporation scopes", () => {
    const enabledApps = getEnabledCorporationApps([
      "esi-corporations.read_contacts.v1",
    ]);

    expect(enabledApps.map((app) => app.name)).toEqual(["Contacts"]);
  });

  it("returns no apps when scopes do not satisfy optional requirements", () => {
    const enabledApps = getEnabledCorporationApps([]);

    expect(enabledApps).toHaveLength(0);
  });

  it("no longer offers a corporation Wallet entry", () => {
    // Corporation wallets are read from the consolidated /wallet page, which
    // merges every readable character and corporation wallet. The corporation
    // entry used to point at /wallet/corporation — a route that never existed
    // and returned 404.
    const enabledApps = getEnabledCorporationApps([
      "esi-wallet.read_corporation_wallets.v1",
    ]);

    expect(enabledApps).toHaveLength(0);
    expect(Object.keys(corporationApps)).not.toContain("wallet");
  });
});
