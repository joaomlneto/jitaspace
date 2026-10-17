import { describe, expect, it } from "@jest/globals";

import {
  EVE_INCURSIONS_SYSTEMS_BY_ROLE,
  incursionSiteRole,
} from "~/app/incursions/siteRoles";
import { EVE_UNIVERSITY_SYSTEMS_BY_ROLE } from "~/app/incursions/siteRolesEveUniversity";
import { INFERRED_SYSTEMS_BY_ROLE } from "~/app/incursions/siteRolesInferred";

describe("incursionSiteRole", () => {
  it("maps null-sec systems from the EVE University wiki", () => {
    expect(incursionSiteRole(30000220)).toBe("vanguard"); // Y0-BVN
    expect(incursionSiteRole(30000231)).toBe("headquarters"); // YXIB-I
  });

  it("maps the large null-sec constellations past the wiki's count rule", () => {
    // 6E-578 (Z-6NQ6), one of four assaults among eleven systems.
    expect(incursionSiteRole(30003270)).toBe("assault");
  });

  it("keeps eve-incursions.de's role where the two disagree", () => {
    // Van (Anama): an assault there, a vanguard on the wiki.
    expect(incursionSiteRole(30004230)).toBe("assault");
    // Melmaniel (Woenckee): only eve-incursions.de lists it.
    expect(incursionSiteRole(30005296)).toBe("vanguard");
  });

  it("drops Intaki: high-sec in low-sec Viriette, never part of an incursion", () => {
    expect(incursionSiteRole(30003788)).toBeUndefined();
  });

  it.each([
    ["Oyeman (Semou)", 30002961, "vanguard"],
    ["Kudi (Yekti)", 30003501, "vanguard"],
    ["Omam (Pezarba)", 30004137, "vanguard"],
    ["Derririntel (Eustron)", 30005025, "vanguard"],
    ["Agoze (Viriette)", 30003787, "vanguard"],
    ["Ostingele (Viriette)", 30003792, "vanguard"],
    ["Vey (Viriette)", 30003790, "assault"],
    ["Arveyil (Enka)", 30003007, "vanguard"],
    ["Nidebora (Enka)", 30003006, "vanguard"],
    ["Faktun (Enka)", 30003002, "assault"],
    ["Halenan (Enka)", 30003003, "assault"],
  ])("corrects %s to the wiki's role", (_name, solarSystemId, role) => {
    expect(incursionSiteRole(solarSystemId)).toBe(role);
  });

  it.each([
    ["R3P0-Z (2FYX-H)", 30001806, "vanguard"],
    ["L1YK-V (2FYX-H)", 30001809, "assault"],
    ["4B-NQN (G2E-RJ)", 30003706, "vanguard"],
    ["9-F0B2 (G2E-RJ)", 30003704, "assault"],
    ["9-7SRQ (5ZAB-N)", 30004219, "headquarters"],
    ["4T-VDE (5ZAB-N)", 30004221, "assault"],
  ])("swaps %s back from the wiki's role", (_name, solarSystemId, role) => {
    expect(incursionSiteRole(solarSystemId)).toBe(role);
  });

  it("completes Ganoure's current layout, not the wiki's older one", () => {
    expect(incursionSiteRole(30003819)).toBe("vanguard"); // Barleguet
    expect(incursionSiteRole(30003823)).toBe("headquarters"); // Kenninck
    expect(incursionSiteRole(30003822)).toBeUndefined(); // Espigoure, staging
  });

  it("leaves out what the wiki gets wrong or lost to Pochven", () => {
    // BB-EKF: 50-5UD's staging system, also listed as a vanguard.
    expect(incursionSiteRole(30004851)).toBeUndefined();
    // Raravoss: moved to Pochven.
    expect(incursionSiteRole(30003495)).toBeUndefined();
  });

  it.each([
    ["Roushzar (Jayai), on no source", 30002975, "headquarters"],
    ["C0T-77 (Crown), an empty wiki row", 30004493, "headquarters"],
    ["Ziriert (Jakemhih), a gap in the wiki's row", 30003562, "vanguard"],
    ["E1-4YH (T-1WDH), in two of the wiki's roles", 30001214, "assault"],
    ["U-O2DA (X-FHU3), in two of the wiki's roles", 30003637, "headquarters"],
  ])("maps %s by the layout rule", (_name, solarSystemId, role) => {
    expect(incursionSiteRole(solarSystemId)).toBe(role);
  });

  it("adds no system twice, nor one eve-incursions.de already maps", () => {
    const wiki = Object.values(EVE_UNIVERSITY_SYSTEMS_BY_ROLE).flat();
    expect(new Set(wiki).size).toBe(wiki.length);
    const mapped = new Set(
      Object.values(EVE_INCURSIONS_SYSTEMS_BY_ROLE).flat(),
    );
    expect(wiki.filter((id) => mapped.has(id))).toEqual([]);
  });

  it("infers only systems neither map has", () => {
    const inferred = Object.values(INFERRED_SYSTEMS_BY_ROLE).flat();
    expect(new Set(inferred).size).toBe(inferred.length);
    const mapped = new Set([
      ...Object.values(EVE_INCURSIONS_SYSTEMS_BY_ROLE).flat(),
      ...Object.values(EVE_UNIVERSITY_SYSTEMS_BY_ROLE).flat(),
    ]);
    expect(inferred.filter((id) => mapped.has(id))).toEqual([]);
  });
});
