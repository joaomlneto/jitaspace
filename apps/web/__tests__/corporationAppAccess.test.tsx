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
      "esi-wallet.read_corporation_wallets.v1",
    ]);

    expect(enabledApps.map((app) => app.name)).toEqual(["Wallet"]);
  });

  it("returns no apps when scopes do not satisfy optional requirements", () => {
    const enabledApps = getEnabledCorporationApps([]);

    expect(enabledApps).toHaveLength(0);
  });
});
