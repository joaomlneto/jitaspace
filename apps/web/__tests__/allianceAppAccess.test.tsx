import { getEnabledApps } from "~/components/Menu/appAccess";
import { allianceApps } from "~/config/apps";

const getEnabledAllianceApps = (
  scopes: Parameters<typeof getEnabledApps>[1],
) => {
  return getEnabledApps(allianceApps, scopes);
};

describe("getEnabledAllianceApps", () => {
  it("returns apps available with granted alliance scopes", () => {
    const enabledApps = getEnabledAllianceApps([
      "esi-alliances.read_contacts.v1",
    ]);

    expect(enabledApps.map((app) => app.name)).toEqual(["Contacts"]);
  });

  it("returns no apps when scopes do not satisfy optional requirements", () => {
    const enabledApps = getEnabledAllianceApps([]);

    expect(enabledApps).toHaveLength(0);
  });
});
