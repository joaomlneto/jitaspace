import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";

import type { EntityKind } from "../../Card/types";
import { AllianceCardDisplay } from "../../Card/AllianceCardDisplay";
import { CharacterCardDisplay } from "../../Card/CharacterCardDisplay";
import { CorporationCardDisplay } from "../../Card/CorporationCardDisplay";
import { EntityLinksProvider } from "../../Card/EntityLinks";
import { KillmailCardDisplay } from "../../Card/KillmailCardDisplay";
import { TypeCardDisplay } from "../../Card/TypeCardDisplay";
import { WarCardDisplay, warStatus } from "../../Card/WarCardDisplay";

/** The routes the web app uses, so the assertions read naturally. */
const ROUTES: Record<EntityKind, string> = {
  alliance: "alliance",
  category: "category",
  character: "character",
  corporation: "corporation",
  faction: "faction",
  group: "group",
  killmail: "kill",
  solar_system: "system",
  type: "type",
  war: "war",
};

const renderWithMantine = (ui: ReactElement) =>
  render(
    <MantineProvider>
      <EntityLinksProvider
        links={{ href: (kind, id) => `/${ROUTES[kind]}/${id}` }}
      >
        {ui}
      </EntityLinksProvider>
    </MantineProvider>,
  );

const linkTo = (name: string) =>
  screen.getByText(name).closest("a")?.getAttribute("href");

/** The value on the same stat row as `label`. */
const statRow = (label: string) => {
  const row = screen.getByText(label).parentElement;
  if (!row) throw new Error(`no row for ${label}`);
  return within(row);
};

describe("EntityLinksProvider", () => {
  it("links nothing without a provider: names render as plain text", () => {
    render(
      <MantineProvider>
        <CharacterCardDisplay characterId={1} character={{ name: "Chribba" }} />
      </MantineProvider>,
    );
    expect(screen.getByText("Chribba").closest("a")).toBeNull();
  });

  it("renders the app's link component, and no link where it has no page", () => {
    const Link = ({ href, ...props }: { href: string }) => (
      <a data-link="app" href={href} {...props} />
    );
    render(
      <MantineProvider>
        <EntityLinksProvider
          links={{
            href: (kind, id) =>
              kind === "character" ? `/pilot/${id}` : undefined,
            component: Link,
          }}
        >
          <CharacterCardDisplay
            characterId={1}
            character={{
              name: "Chribba",
              corporation: { id: 2, name: "Corp" },
            }}
          />
        </EntityLinksProvider>
      </MantineProvider>,
    );
    const anchor = screen.getByText("Chribba").closest("a");
    expect(anchor).toHaveAttribute("href", "/pilot/1");
    expect(anchor).toHaveAttribute("data-link", "app");
    expect(screen.getByText("Corp").closest("a")).toBeNull();
  });
});

describe("AllianceCardDisplay", () => {
  const alliance = {
    name: "Goonswarm Federation",
    ticker: "CONDI",
    dateFounded: new Date("2010-06-01T05:36:00Z"),
    executorCorporation: { id: 11, name: "Executor Corp" },
    creatorCorporation: { id: 12, name: "Creator Corp" },
    creator: { id: 13, name: "Creator Pilot" },
    memberCorporations: Array.from({ length: 30 }, (_, i) => ({
      id: 100 + i,
      name: `Member ${i}`,
    })),
    memberCorporationCount: 807,
  };

  it("renders the alliance with linked executor, creators and members", () => {
    renderWithMantine(
      <AllianceCardDisplay allianceId={1354830081} alliance={alliance} />,
    );
    expect(linkTo("Goonswarm Federation")).toBe("/alliance/1354830081");
    expect(screen.getByText("CONDI")).toBeInTheDocument();
    expect(linkTo("Executor Corp")).toBe("/corporation/11");
    expect(linkTo("Creator Pilot")).toBe("/character/13");
    expect(statRow("Founded").getByText("2010-06-01")).toBeInTheDocument();
  });

  it("lists 24 member corporations and counts the rest", () => {
    renderWithMantine(
      <AllianceCardDisplay allianceId={1} alliance={alliance} />,
    );
    expect(statRow("Member corporations").getByText("807")).toBeInTheDocument();
    expect(screen.getByText("Member 23")).toBeInTheDocument();
    expect(screen.queryByText("Member 24")).not.toBeInTheDocument();
    expect(screen.getByText("+783 more")).toBeInTheDocument();
  });

  it("reads N/A for what the alliance does not have", () => {
    renderWithMantine(
      <AllianceCardDisplay allianceId={1} alliance={{ name: "Small" }} />,
    );
    expect(statRow("Founded").getByText("N/A")).toBeInTheDocument();
    expect(statRow("Creator").getByText("N/A")).toBeInTheDocument();
  });

  it("shows no stats in its compact variant", () => {
    renderWithMantine(
      <AllianceCardDisplay
        allianceId={1}
        alliance={alliance}
        variant="compact"
      />,
    );
    expect(screen.getByText("Goonswarm Federation")).toBeInTheDocument();
    expect(screen.queryByText("Founded")).not.toBeInTheDocument();
    expect(screen.queryByText("Member 0")).not.toBeInTheDocument();
  });
});

describe("CorporationCardDisplay", () => {
  const corporation = {
    name: "EVE University",
    ticker: "E-UNI",
    alliance: { id: 937872513, name: "Ivy League" },
    ceo: { id: 91541581, name: "The CEO" },
    creator: { id: 540496093, name: "The Founder" },
    memberCount: 5716,
    taxRate: 10,
    shares: 1000,
    dateFounded: new Date("2004-03-15T14:33:00Z"),
    warEligible: false,
    description: "EVE's premier teaching organization",
    url: "https://www.eveuniversity.org",
  };

  it("renders the corporation's details", () => {
    renderWithMantine(
      <CorporationCardDisplay
        corporationId={917701062}
        corporation={corporation}
      />,
    );
    expect(linkTo("EVE University")).toBe("/corporation/917701062");
    expect(screen.getByText("E-UNI")).toBeInTheDocument();
    expect(linkTo("Ivy League")).toBe("/alliance/937872513");
    expect(linkTo("The CEO")).toBe("/character/91541581");
    expect(statRow("Members").getByText("5,716")).toBeInTheDocument();
    expect(statRow("Tax rate").getByText("10.0%")).toBeInTheDocument();
    expect(statRow("Shares").getByText("1,000")).toBeInTheDocument();
    expect(statRow("War eligible").getByText("No")).toBeInTheDocument();
    expect(
      screen.getByText("EVE's premier teaching organization"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "https://www.eveuniversity.org" }),
    ).toHaveAttribute("target", "_blank");
  });

  it("reads N/A for unknown metadata and links no non-http url", () => {
    renderWithMantine(
      <CorporationCardDisplay
        corporationId={1}
        corporation={{ name: "Sparse", url: "javascript:alert(1)" }}
      />,
    );
    for (const label of ["Members", "Tax rate", "Shares", "War eligible"])
      expect(statRow(label).getByText("N/A")).toBeInTheDocument();
    expect(screen.queryByText("javascript:alert(1)")).not.toBeInTheDocument();
  });

  it("shows a palette stripe only when the corporation has a palette", () => {
    const { rerender } = renderWithMantine(
      <CorporationCardDisplay corporationId={1} corporation={corporation} />,
    );
    expect(
      screen.queryByTestId("corporation-palette-stripe"),
    ).not.toBeInTheDocument();

    rerender(
      <MantineProvider>
        <CorporationCardDisplay
          corporationId={1}
          corporation={{
            ...corporation,
            palette: { main_color: "#0029ff", secondary_color: "#009cff" },
          }}
        />
      </MantineProvider>,
    );
    expect(
      screen.getByTestId("corporation-palette-stripe").children,
    ).toHaveLength(2);
  });
});

describe("CharacterCardDisplay", () => {
  it("renders the character with corporation, alliance and militia", () => {
    renderWithMantine(
      <CharacterCardDisplay
        characterId={196379789}
        character={{
          name: "Chribba",
          corporation: { id: 1, name: "Otherworld Enterprises" },
          alliance: { id: 2, name: "Otherworld Empire" },
          faction: { id: 500001, name: "Caldari State" },
          birthday: new Date("2003-06-10T17:47:00Z"),
          securityStatus: -3.44,
        }}
      />,
    );
    expect(linkTo("Chribba")).toBe("/character/196379789");
    expect(linkTo("Otherworld Enterprises")).toBe("/corporation/1");
    expect(linkTo("Otherworld Empire")).toBe("/alliance/2");
    expect(linkTo("Caldari State")).toBe("/faction/500001");
    expect(statRow("Security status").getByText("-3.4")).toBeInTheDocument();
  });

  it("shows skeletons, not names, while loading", () => {
    const { container } = renderWithMantine(
      <CharacterCardDisplay characterId={1} />,
    );
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
    expect(
      container.querySelectorAll(".mantine-Skeleton-root").length,
    ).toBeGreaterThan(0);
  });
});

describe("warStatus", () => {
  const now = new Date("2026-10-13T12:00:00Z");
  const before = new Date("2026-10-01T00:00:00Z");
  const after = new Date("2026-10-20T00:00:00Z");

  it.each([
    [{ started: after }, "declared"],
    [{ started: before }, "active"],
    [{ started: before, finished: after }, "ending"],
    [{ started: before, finished: before }, "finished"],
  ] as const)("reads %p as %s", (war, status) => {
    expect(warStatus(war, now)).toBe(status);
  });
});

describe("WarCardDisplay", () => {
  const war = {
    aggressor: {
      kind: "alliance" as const,
      entity: { id: 131511956, name: "Tactical Narcotics Team" },
      iskDestroyed: 5_100_346_700,
      shipsKilled: 74,
    },
    defender: {
      kind: "corporation" as const,
      entity: { id: 98580276, name: "Defender Corp" },
      iskDestroyed: 0,
      shipsKilled: 0,
    },
    allies: [
      { kind: "alliance" as const, entity: { id: 1, name: "First Ally" } },
    ],
    status: "active" as const,
    openForAllies: true,
  };

  it("links the war and both sides, with each side's losses", () => {
    renderWithMantine(<WarCardDisplay warId={739773} war={war} />);
    expect(linkTo("War 739773")).toBe("/war/739773");
    expect(
      screen.getAllByText("Tactical Narcotics Team")[0]?.closest("a"),
    ).toHaveAttribute("href", "/alliance/131511956");
    expect(
      screen.getAllByText("Defender Corp")[0]?.closest("a"),
    ).toHaveAttribute("href", "/corporation/98580276");
    expect(screen.getByText("5.1B ISK")).toBeInTheDocument();
    expect(screen.getByText("74 ships killed")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(linkTo("First Ally")).toBe("/alliance/1");
    expect(statRow("Ends").getByText("Not set")).toBeInTheDocument();
  });
});

describe("TypeCardDisplay", () => {
  it("renders the type's place in the inventory, size and price", () => {
    renderWithMantine(
      <TypeCardDisplay
        typeId={587}
        type={{
          name: "Rifter",
          group: { id: 25, name: "Frigate" },
          category: { id: 6, name: "Ship" },
          volume: 2500,
          mass: 1_067_000,
          capacity: 140,
          price: 284_513.53,
        }}
      />,
    );
    expect(linkTo("Rifter")).toBe("/type/587");
    expect(linkTo("Frigate")).toBe("/group/25");
    expect(linkTo("Ship")).toBe("/category/6");
    expect(statRow("Volume").getByText("2,500 m³")).toBeInTheDocument();
    expect(statRow("Mass").getByText("1,067,000 kg")).toBeInTheDocument();
    expect(screen.getByText("284.5K ISK")).toBeInTheDocument();
    expect(screen.queryByText("Unpublished")).not.toBeInTheDocument();
  });
});

describe("KillmailCardDisplay", () => {
  const killmail = {
    time: new Date("2024-03-21T20:32:49Z"),
    victim: {
      character: { id: 1239356440, name: "daarkfyre" },
      ship: { id: 11393, name: "Retribution" },
      damageTaken: 5759,
    },
    finalBlow: { character: { id: 2121551136, name: "Anonymous Comet" } },
    attackerCount: 30,
    solarSystem: { id: 30000872, name: "Q-CAB2", securityStatus: -0.776 },
  };

  it("renders the loss with its location, final blow and killboard links", () => {
    renderWithMantine(
      <KillmailCardDisplay killmailId={116421364} killmail={killmail} />,
    );
    expect(linkTo("Retribution")).toBe("/kill/116421364");
    expect(linkTo("daarkfyre")).toBe("/character/1239356440");
    expect(linkTo("Q-CAB2")).toBe("/system/30000872");
    expect(linkTo("Anonymous Comet")).toBe("/character/2121551136");
    expect(statRow("Attackers").getByText("30")).toBeInTheDocument();
    expect(screen.getByText("zKillboard").closest("a")).toHaveAttribute(
      "href",
      "https://zkillboard.com/kill/116421364/",
    );
    expect(screen.queryByText("Solo")).not.toBeInTheDocument();
  });

  it("shows the value row only when a killboard priced the kill", () => {
    const { rerender } = renderWithMantine(
      <KillmailCardDisplay killmailId={1} killmail={killmail} />,
    );
    expect(screen.queryByText("Value")).not.toBeInTheDocument();
    rerender(
      <MantineProvider>
        <KillmailCardDisplay
          killmailId={1}
          killmail={{ ...killmail, value: 186_400_000, attackerCount: 1 }}
        />
      </MantineProvider>,
    );
    expect(statRow("Value").getByText("186.4M ISK")).toBeInTheDocument();
    expect(screen.getByText("Solo")).toBeInTheDocument();
  });
});
