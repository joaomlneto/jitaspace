import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it } from "@jest/globals";

import { getEnabledApps } from "~/components/Menu/appAccess";
import { characterApps, extraJitaFeatures } from "~/config/apps";

const getEnabledCharacterApps = (
  scopes: Parameters<typeof getEnabledApps>[1],
) => {
  return getEnabledApps(characterApps, scopes);
};

describe("character app access", () => {
  it("enables apps with satisfied required scopes", () => {
    const enabledApps = getEnabledCharacterApps([
      "esi-mail.read_mail.v1",
      "esi-mail.send_mail.v1",
      "esi-search.search_structures.v1",
      "esi-skills.read_skills.v1",
      "esi-skills.read_skillqueue.v1",
    ]);

    expect(enabledApps.map((app) => app.name)).toEqual(
      expect.arrayContaining(["EveMail", "Skills"]),
    );
  });

  it("disables apps when required scopes are missing", () => {
    const enabledApps = getEnabledCharacterApps(["esi-skills.read_skills.v1"]);

    expect(enabledApps.map((app) => app.name)).not.toContain("Skills");
    expect(enabledApps.map((app) => app.name)).not.toContain("EveMail");
  });

  it("enables optional-only apps when at least one optional scope set is satisfied", () => {
    const enabledApps = getEnabledCharacterApps([
      "esi-characters.read_contacts.v1",
    ]);

    expect(enabledApps.map((app) => app.name)).toContain("Contacts");
  });

  it("enables Mercenary Operations with the activities scope alone", () => {
    // Den locations need a structures scope too, but the page works without
    // it, so it must not be what decides whether the app is offered.
    const enabledApps = getEnabledCharacterApps([
      "esi-activities.read_character.v1",
    ]);

    expect(enabledApps.map((app) => app.name)).toContain(
      "Mercenary Operations",
    );
    expect(getEnabledCharacterApps([]).map((app) => app.name)).not.toContain(
      "Mercenary Operations",
    );
  });

  it("asks for the Mercenary Den locations at login, without gating the app on them", () => {
    // The login modal requests every extra feature by default, so a later
    // login keeps the scope instead of quietly dropping it.
    expect(extraJitaFeatures.flatMap((feature) => feature.scopes)).toContain(
      "esi-structures.read_character.v1",
    );
    const mercenaryApp = Object.values(characterApps).find(
      (app) => app.url === "/mercenary-tactical-operations",
    );
    expect(mercenaryApp?.scopes.optional).toBeUndefined();
  });

  it("disables optional-only apps when no optional scope is granted", () => {
    const enabledApps = getEnabledCharacterApps([]);

    expect(enabledApps.map((app) => app.name)).not.toContain("Contacts");
    expect(enabledApps.map((app) => app.name)).not.toContain("Wallet");
  });
});
