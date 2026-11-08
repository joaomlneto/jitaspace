import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";

import type * as AllianceCardModule from "~/components/Card/AllianceCard";
import type * as CharacterCardModule from "~/components/Card/CharacterCard";
import type * as CorporationCardModule from "~/components/Card/CorporationCard";
import type * as EveEntityCardModule from "~/components/Card/EveEntityCard";
import type * as EveMailSenderCardDisplayModule from "~/components/Card/EveMailSenderCardDisplay";
import type * as KillmailCardModule from "~/components/Card/KillmailCard";
import type * as TypeCardModule from "~/components/Card/TypeCard";
import type * as UseEntityRefsModule from "~/components/Card/useEntityRefs";
import type * as WarCardModule from "~/components/Card/WarCard";
import type * as LinkModule from "~/components/Link";

// ---------------------------------------------------------------------------
// Hook mocks. The cards render the real @jitaspace/ui card displays; only the
// data comes from these.
// ---------------------------------------------------------------------------
const mockUseEsiAllianceInformation = jest.fn();
const mockUseEsiAllianceMemberCorporations = jest.fn();
const mockUseCharacter = jest.fn();
const mockUseCorporation = jest.fn();
const mockUseWar = jest.fn();
const mockUseType = jest.fn();
const mockUseGroup = jest.fn();
const mockUseCategory = jest.fn();
const mockUseMarketPrices = jest.fn();
const mockUseKillmail = jest.fn();
const mockUseSolarSystem = jest.fn();
const mockUseEsiName = jest.fn();
const mockUseEsiNameLookup = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useEsiAllianceInformation: (...a: unknown[]) =>
    mockUseEsiAllianceInformation(...a),
  useEsiAllianceMemberCorporations: (...a: unknown[]) =>
    mockUseEsiAllianceMemberCorporations(...a),
  useCharacter: (...a: unknown[]) => mockUseCharacter(...a),
  useCorporation: (...a: unknown[]) => mockUseCorporation(...a),
  useWar: (...a: unknown[]) => mockUseWar(...a),
  useType: (...a: unknown[]) => mockUseType(...a),
  useGroup: (...a: unknown[]) => mockUseGroup(...a),
  useCategory: (...a: unknown[]) => mockUseCategory(...a),
  useMarketPrices: (...a: unknown[]) => mockUseMarketPrices(...a),
  useKillmail: (...a: unknown[]) => mockUseKillmail(...a),
  useSolarSystem: (...a: unknown[]) => mockUseSolarSystem(...a),
  useEsiName: (...a: unknown[]) => mockUseEsiName(...a),
  useEsiNameLookup: (...a: unknown[]) => mockUseEsiNameLookup(...a),
}));

// The cards render the real @jitaspace/ui card displays (the package is
// otherwise stubbed for web tests), linked through the real web routes.
jest.mock("@jitaspace/ui", () =>
  jest.requireActual("../../../packages/ui/Card"),
);

jest.mock("@jitaspace/eve-components", () => ({
  EveEntityAvatar: ({ entityId }: { entityId: number | string }) => (
    <span data-testid="entity-avatar">{`EntityAvatar ${entityId}`}</span>
  ),
}));

const { AllianceCard } =
  require("~/components/Card/AllianceCard") as typeof AllianceCardModule;
const { CharacterCard } =
  require("~/components/Card/CharacterCard") as typeof CharacterCardModule;
const { CorporationCard } =
  require("~/components/Card/CorporationCard") as typeof CorporationCardModule;
const { EveEntityCard } =
  require("~/components/Card/EveEntityCard") as typeof EveEntityCardModule;
const { EveMailSenderCardDisplay } =
  require("~/components/Card/EveMailSenderCardDisplay") as typeof EveMailSenderCardDisplayModule;
const { KillmailCard } =
  require("~/components/Card/KillmailCard") as typeof KillmailCardModule;
const { TypeCard } =
  require("~/components/Card/TypeCard") as typeof TypeCardModule;
const { WarCard } =
  require("~/components/Card/WarCard") as typeof WarCardModule;

// Required after the mocks above: jest.mock is not hoisted past imports here.
const { WebEntityLinksProvider } =
  require("~/components/Link") as typeof LinkModule;

const renderWithMantine = (ui: React.ReactElement) =>
  render(
    <MantineProvider>
      <WebEntityLinksProvider>{ui}</WebEntityLinksProvider>
    </MantineProvider>,
  );

/** Every id resolves to "Name <id>" through the name lookup. */
const resolveAllNames = () =>
  mockUseEsiNameLookup.mockImplementation((entries: unknown) =>
    Object.fromEntries(
      (entries as { id: number }[]).map(({ id }) => [
        id.toString(),
        { status: "success", value: { name: `Name ${id}` } },
      ]),
    ),
  );

const linkTo = (name: string) =>
  screen.getAllByText(name)[0]?.closest("a")?.getAttribute("href");

const statRow = (label: string) => {
  const row = screen.getByText(label).parentElement;
  if (!row) throw new Error(`no row for ${label}`);
  return within(row);
};

beforeEach(() => {
  for (const mock of [
    mockUseEsiAllianceInformation,
    mockUseEsiAllianceMemberCorporations,
    mockUseCharacter,
    mockUseCorporation,
    mockUseWar,
    mockUseType,
    mockUseGroup,
    mockUseCategory,
    mockUseKillmail,
    mockUseSolarSystem,
  ])
    mock.mockReturnValue({ data: undefined });
  mockUseMarketPrices.mockReturnValue({ data: {} });
  mockUseEsiName.mockReturnValue({ name: "Some Entity", category: undefined });
  resolveAllNames();
});

describe("AllianceCard", () => {
  it("fills the alliance card from ESI and resolves every name", () => {
    mockUseEsiAllianceInformation.mockReturnValue({
      data: {
        data: {
          name: "Goonswarm Federation",
          ticker: "CONDI",
          date_founded: "2010-06-01T05:36:00Z",
          executor_corporation_id: 1344654522,
          creator_corporation_id: 459299583,
          creator_id: 240070320,
        },
      },
    });
    mockUseEsiAllianceMemberCorporations.mockReturnValue({
      data: { data: Array.from({ length: 30 }, (_, i) => 98000000 + i) },
    });

    renderWithMantine(<AllianceCard allianceId={1354830081} />);

    expect(mockUseEsiAllianceInformation).toHaveBeenCalledWith(1354830081);
    expect(linkTo("Goonswarm Federation")).toBe("/alliance/1354830081");
    expect(linkTo("Name 1344654522")).toBe("/corporation/1344654522");
    expect(linkTo("Name 240070320")).toBe("/character/240070320");
    expect(statRow("Member corporations").getByText("30")).toBeInTheDocument();
    expect(screen.getByText("+6 more")).toBeInTheDocument();
  });

  it("resolves only the member corporations the card lists", () => {
    mockUseEsiAllianceInformation.mockReturnValue({
      data: {
        data: { name: "Big", ticker: "BIG", date_founded: "2010-01-01" },
      },
    });
    mockUseEsiAllianceMemberCorporations.mockReturnValue({
      data: { data: Array.from({ length: 800 }, (_, i) => 98000000 + i) },
    });

    renderWithMantine(<AllianceCard allianceId={1} />);

    const entries = mockUseEsiNameLookup.mock.calls.at(-1)?.[0] as {
      id: number;
    }[];
    expect(entries).toHaveLength(24);
  });

  it("renders skeletons until ESI answers", () => {
    const { container } = renderWithMantine(<AllianceCard allianceId={1} />);
    expect(
      container.querySelectorAll(".mantine-Skeleton-root").length,
    ).toBeGreaterThan(0);
  });
});

describe("CorporationCard", () => {
  const corporation = {
    name: "EVE University",
    ticker: "E-UNI",
    alliance_id: 937872513,
    ceo_id: 91541581,
    creator_id: 540496093,
    date_founded: "2004-03-15T14:33:00Z",
    description:
      '<font size="16"><b>EVE University - EVE\'s premier teaching organization</b></font>',
    member_count: 5716,
    shares: 1000,
    tax_rates: { isk: 10, loyalty_point: 5.6 },
    url: "https://www.eveuniversity.org",
    war_eligible: false,
  };

  it("fills the corporation card, stripping the description's markup", () => {
    mockUseCorporation.mockReturnValue({ data: { data: corporation } });

    renderWithMantine(<CorporationCard corporationId={917701062} />);

    expect(linkTo("EVE University")).toBe("/corporation/917701062");
    expect(linkTo("Name 937872513")).toBe("/alliance/937872513");
    expect(linkTo("Name 91541581")).toBe("/character/91541581");
    expect(statRow("Tax rate").getByText("10.0%")).toBeInTheDocument();
    expect(
      screen.getByText("EVE University - EVE's premier teaching organization"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/<font/i)).not.toBeInTheDocument();
  });

  it("reads N/A rather than throwing when tax_rates arrives without isk", () => {
    mockUseCorporation.mockReturnValue({
      data: { data: { ...corporation, tax_rates: { loyalty_point: 5 } } },
    });
    renderWithMantine(<CorporationCard corporationId={1} />);
    expect(statRow("Tax rate").getByText("N/A")).toBeInTheDocument();
  });

  it("dresses the card in the corporation's palette", () => {
    mockUseCorporation.mockReturnValue({
      data: {
        data: {
          ...corporation,
          palette: { main_color: "#0029ff", secondary_color: "#009cff" },
        },
      },
    });
    renderWithMantine(<CorporationCard corporationId={1} />);
    expect(
      screen.getByTestId("corporation-palette-stripe").children,
    ).toHaveLength(2);
  });
});

describe("CharacterCard", () => {
  it("fills the character card from useCharacter", () => {
    mockUseCharacter.mockReturnValue({
      data: {
        name: "Chribba",
        corporationId: 1164409536,
        allianceId: 159826257,
        birthday: new Date("2003-06-10T17:47:00Z"),
        securityStatus: 5.1,
      },
    });

    renderWithMantine(<CharacterCard characterId={196379789} />);

    expect(mockUseCharacter).toHaveBeenCalledWith(196379789);
    expect(linkTo("Chribba")).toBe("/character/196379789");
    expect(linkTo("Name 1164409536")).toBe("/corporation/1164409536");
    expect(linkTo("Name 159826257")).toBe("/alliance/159826257");
    expect(statRow("Security status").getByText("5.1")).toBeInTheDocument();
  });

  it("badges a CSM 21 candidate, linking to their card on /csm", () => {
    // Ceema (KarmaFleet), standing for CSM 21.
    renderWithMantine(<CharacterCard characterId={585213969} />);
    expect(
      screen.getByRole("link", { name: "CSM 21 Candidate" }),
    ).toHaveAttribute("href", "/csm#candidate-585213969");
  });

  it("does not badge a character who is not standing", () => {
    renderWithMantine(<CharacterCard characterId={123} />);
    expect(screen.queryByText("CSM 21 Candidate")).not.toBeInTheDocument();
  });

  it("drops the badge when asked to, as /csm does", () => {
    renderWithMantine(
      <CharacterCard characterId={585213969} withCsmBadge={false} />,
    );
    expect(screen.queryByText("CSM 21 Candidate")).not.toBeInTheDocument();
  });
});

describe("WarCard", () => {
  it("fills the war card, naming both sides and deriving its status", () => {
    mockUseWar.mockReturnValue({
      data: {
        data: {
          id: 739773,
          aggressor: {
            alliance_id: 131511956,
            isk_destroyed: 5_100_346_700,
            ships_killed: 74,
          },
          defender: {
            corporation_id: 98580276,
            isk_destroyed: 0,
            ships_killed: 0,
          },
          allies: [{ alliance_id: 99000001 }],
          declared: "2024-03-20T20:09:00Z",
          started: "2024-03-21T20:09:00Z",
          finished: "2024-03-28T20:25:00Z",
          mutual: false,
          open_for_allies: true,
        },
      },
    });

    renderWithMantine(<WarCard warId={739773} />);

    expect(linkTo("War 739773")).toBe("/war/739773");
    expect(linkTo("Name 131511956")).toBe("/alliance/131511956");
    expect(linkTo("Name 98580276")).toBe("/corporation/98580276");
    expect(linkTo("Name 99000001")).toBe("/alliance/99000001");
    expect(screen.getByText("Finished")).toBeInTheDocument();
    expect(screen.getByText("74 ships killed")).toBeInTheDocument();
  });
});

describe("TypeCard", () => {
  it("fills the type card from the type, its group, category and price", () => {
    mockUseType.mockReturnValue({
      data: {
        data: {
          name: "Rifter",
          group_id: 25,
          volume: 27289,
          packaged_volume: 2500,
          mass: 1_067_000,
          capacity: 140,
          published: true,
          description: "A <b>frigate</b>.",
        },
      },
    });
    mockUseGroup.mockReturnValue({
      data: { data: { name: "Frigate", category_id: 6 } },
    });
    mockUseCategory.mockReturnValue({ data: { data: { name: "Ship" } } });
    mockUseMarketPrices.mockReturnValue({
      data: { 587: { average_price: 284_513.53 } },
    });

    renderWithMantine(<TypeCard typeId={587} />);

    expect(mockUseGroup).toHaveBeenCalledWith(25);
    expect(mockUseCategory).toHaveBeenCalledWith(6);
    expect(linkTo("Frigate")).toBe("/group/25");
    expect(linkTo("Ship")).toBe("/category/6");
    expect(statRow("Volume").getByText("2,500 m³")).toBeInTheDocument();
    expect(screen.getByText("284.5K ISK")).toBeInTheDocument();
    expect(screen.getByText("A frigate .")).toBeInTheDocument();
  });

  it("reads N/A for the capacity of items that hold nothing", () => {
    mockUseType.mockReturnValue({
      data: {
        data: { name: "Tritanium", group_id: 18, capacity: 0, published: true },
      },
    });
    renderWithMantine(<TypeCard typeId={34} />);
    expect(statRow("Capacity").getByText("N/A")).toBeInTheDocument();
  });
});

describe("KillmailCard", () => {
  it("fills the killmail card from the killmail and its system", () => {
    mockUseKillmail.mockReturnValue({
      data: {
        data: {
          killmail_id: 116421364,
          killmail_time: "2024-03-21T20:32:49Z",
          solar_system_id: 30000872,
          victim: {
            character_id: 1239356440,
            corporation_id: 98012419,
            ship_type_id: 11393,
            damage_taken: 5759,
          },
          attackers: [
            { character_id: 1, final_blow: false },
            { character_id: 2121551136, final_blow: true, ship_type_id: 12023 },
          ],
        },
      },
    });
    mockUseSolarSystem.mockReturnValue({
      data: { data: { security_status: -0.776 } },
    });

    renderWithMantine(
      <KillmailCard killmailId={116421364} killmailHash="abc" />,
    );

    expect(mockUseKillmail).toHaveBeenCalledWith("abc", 116421364);
    expect(mockUseSolarSystem).toHaveBeenCalledWith(30000872);
    expect(linkTo("Name 11393")).toBe("/kill/116421364");
    expect(linkTo("Name 1239356440")).toBe("/character/1239356440");
    expect(linkTo("Name 2121551136")).toBe("/character/2121551136");
    expect(linkTo("Name 30000872")).toBe("/system/30000872");
    expect(statRow("Attackers").getByText("2")).toBeInTheDocument();
  });
});

describe("EveEntityCard", () => {
  it("delegates to AllianceCard for alliance entities", () => {
    mockUseEsiName.mockReturnValue({
      name: "Some Alliance",
      category: "alliance",
    });
    renderWithMantine(<EveEntityCard entityId={99000001} />);
    expect(mockUseEsiAllianceInformation).toHaveBeenCalledWith(99000001);
  });

  it("delegates to CorporationCard for corporation entities", () => {
    mockUseEsiName.mockReturnValue({
      name: "Some Corp",
      category: "corporation",
    });
    renderWithMantine(<EveEntityCard entityId="98000001" />);
    expect(mockUseCorporation).toHaveBeenCalledWith(98000001);
  });

  it("delegates to CharacterCard for character entities", () => {
    mockUseEsiName.mockReturnValue({
      name: "Some Pilot",
      category: "character",
    });
    renderWithMantine(<EveEntityCard entityId={123} />);
    expect(mockUseCharacter).toHaveBeenCalledWith(123);
  });

  it("renders a generic entity paper for other categories", () => {
    mockUseEsiName.mockReturnValue({ name: "The Forge", category: "region" });
    renderWithMantine(<EveEntityCard entityId={10000002} />);
    expect(screen.getByText("The Forge")).toBeInTheDocument();
    expect(screen.getByTestId("entity-avatar")).toBeInTheDocument();
  });
});

describe("EveMailSenderCardDisplay", () => {
  it("renders 'Unknown' when no senderId is supplied", () => {
    renderWithMantine(<EveMailSenderCardDisplay />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("renders 'Unknown' (loading) when isLoading and no senderId", () => {
    renderWithMantine(<EveMailSenderCardDisplay isLoading />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("delegates to EveEntityCard when a senderId is supplied", () => {
    mockUseEsiName.mockReturnValue({ name: "Sender Name", category: "region" });
    renderWithMantine(<EveMailSenderCardDisplay senderId={123} />);
    expect(screen.getByText("Sender Name")).toBeInTheDocument();
  });
});

describe("plainText", () => {
  const { plainText } =
    require("~/components/Card/useEntityRefs") as typeof UseEntityRefsModule;

  it("drops EVE's markup and collapses whitespace", () => {
    expect(plainText('<font size="14">A <b>frigate</b></font>.\n')).toBe(
      "A frigate .",
    );
  });

  it("keeps a stray '<' that opens no tag", () => {
    expect(plainText("damage < 100 <b>ok</b>")).toBe("damage < 100 ok");
  });

  it("strips a long run of unclosed '<' in linear time", () => {
    const text = "<".repeat(50_000);
    const started = performance.now();
    expect(plainText(text)).toBe(text);
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it("reads an empty description as none", () => {
    expect(plainText("<br>  <br>")).toBeUndefined();
  });
});
