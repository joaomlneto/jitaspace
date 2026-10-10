import { describe, expect, it } from "@jest/globals";

import { incursionSiteRole } from "~/app/incursions/siteRoles";
import { EVE_UNIVERSITY_SYSTEMS_BY_ROLE } from "~/app/incursions/siteRolesEveUniversity";

describe("incursionSiteRole", () => {
  it("maps null-sec systems from the EVE University wiki", () => {
    expect(incursionSiteRole(30000220)).toBe("vanguard"); // Y0-BVN
    expect(incursionSiteRole(30000231)).toBe("headquarters"); // YXIB-I
  });

  it("keeps eve-incursions.de's role where the two disagree", () => {
    // Oyeman (Semou): an assault there, a vanguard on the wiki.
    expect(incursionSiteRole(30002961)).toBe("assault");
    // Melmaniel (Woenckee): only eve-incursions.de lists it.
    expect(incursionSiteRole(30005296)).toBe("vanguard");
  });

  it("leaves out what the wiki gets wrong or lost to Pochven", () => {
    // Barleguet (Ganoure): ESI's staging contradicts the wiki's layout.
    expect(incursionSiteRole(30003819)).toBeUndefined();
    // Raravoss: moved to Pochven.
    expect(incursionSiteRole(30003495)).toBeUndefined();
  });

  it("adds no system twice", () => {
    const all = Object.values(EVE_UNIVERSITY_SYSTEMS_BY_ROLE).flat();
    expect(new Set(all).size).toBe(all.length);
  });
});
