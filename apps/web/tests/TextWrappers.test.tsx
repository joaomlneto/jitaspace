import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// Import from the barrel so index.ts is covered too.
import {
  AsteroidBeltName,
  BloodlineName,
  CalendarEventOwnerName,
  CategoryName,
  DogmaAttributeName,
  DogmaEffectName,
  GroupName,
  LabelName,
  MailingListName,
  MarketGroupName,
  MoonName,
  PlanetName,
  RaceName,
  StargateName,
  StarName,
  WarAggressorName,
  WarDefenderName,
} from "~/components/Text";

// ---------------------------------------------------------------------------
// Mock @jitaspace/hooks. Each hook returns data shaped exactly as the matching
// wrapper in components/Text reads it, with a unique value so getByText is
// unambiguous.
// ---------------------------------------------------------------------------
jest.mock("@jitaspace/hooks", () => ({
  // { data: { data: { name } } }
  useAsteroidBelt: () => ({ data: { data: { name: "Asteroid Belt Value" } } }),
  useCategory: () => ({ data: { data: { name: "Category Value" } } }),
  useDogmaAttribute: () => ({
    data: { data: { name: "Dogma Attribute Value" } },
  }),
  useDogmaEffect: () => ({ data: { data: { name: "Dogma Effect Value" } } }),
  useGroup: () => ({ data: { data: { name: "Group Value" } } }),
  useMoon: () => ({ data: { data: { name: "Moon Value" } } }),
  usePlanet: () => ({ data: { data: { name: "Planet Value" } } }),
  useStargate: () => ({ data: { data: { name: "Stargate Value" } } }),
  useStar: () => ({ data: { data: { name: "Star Value" } } }),

  // { data: { name } }
  useBloodline: () => ({ data: { name: "Bloodline Value" } }),
  useRace: () => ({ data: { name: "Race Value" } }),

  // returns the object directly (no `data` wrapper)
  useMarketGroup: () => ({ name: "Market Group Value" }),

  // LabelName: data?.data.labels?.find((l) => l.label_id === labelId)
  useCharacterMailLabels: () => ({
    data: {
      data: {
        labels: [
          { label_id: 7, name: "Wrong Label" },
          { label_id: 42, name: "Label Value" },
        ],
      },
    },
  }),

  // MailingListName: data?.data.find((ml) => ml.mailing_list_id === mailingListId)
  useCharacterMailingLists: () => ({
    data: {
      data: [
        { mailing_list_id: 9, name: "Wrong List" },
        { mailing_list_id: 99, name: "Mailing List Value" },
      ],
    },
  }),

  // CalendarEventOwnerName: event?.data.owner_id / owner_type
  useCalendarEvent: (characterId?: number, eventId?: number) => {
    const byEvent: Record<number, { owner_id: number; owner_type: string }> = {
      1: { owner_id: 1001, owner_type: "alliance" },
      2: { owner_id: 2002, owner_type: "corporation" },
      3: { owner_id: 3003, owner_type: "character" },
      4: { owner_id: 4004, owner_type: "faction" },
    };
    const data = eventId !== undefined ? byEvent[eventId] : undefined;
    return { data: data ? { data } : undefined };
  },

  // WarAggressorName / WarDefenderName
  useWar: () => ({
    data: {
      data: {
        aggressor: { alliance_id: 5005, corporation_id: 6006 },
        defender: { alliance_id: 7007, corporation_id: 8008 },
      },
    },
  }),
}));

// ---------------------------------------------------------------------------
// Mock @jitaspace/ui. Every dumb component a wrapper renders is stubbed as a
// passthrough that renders the key prop it receives.
// ---------------------------------------------------------------------------
jest.mock("@jitaspace/ui", () => ({
  AsteroidBeltName: ({ name }: { name?: ReactNode }) => (
    <span>{String(name ?? "")}</span>
  ),
  BloodlineName: ({ name }: { name?: ReactNode }) => (
    <span>{String(name ?? "")}</span>
  ),
  CategoryName: ({ name }: { name?: ReactNode }) => (
    <span>{String(name ?? "")}</span>
  ),
  DogmaAttributeName: ({ name }: { name?: ReactNode }) => (
    <span>{String(name ?? "")}</span>
  ),
  DogmaEffectName: ({ name }: { name?: ReactNode }) => (
    <span>{String(name ?? "")}</span>
  ),
  GroupName: ({ name }: { name?: ReactNode }) => (
    <span>{String(name ?? "")}</span>
  ),
  LabelName: ({ name }: { name?: ReactNode }) => (
    <span>{String(name ?? "")}</span>
  ),
  MailingListName: ({ name }: { name?: ReactNode }) => (
    <span>{String(name ?? "")}</span>
  ),
  MarketGroupName: ({ name }: { name?: ReactNode }) => (
    <span>{String(name ?? "")}</span>
  ),
  MoonName: ({ name }: { name?: ReactNode }) => (
    <span>{String(name ?? "")}</span>
  ),
  PlanetName: ({ name }: { name?: ReactNode }) => (
    <span>{String(name ?? "")}</span>
  ),
  RaceName: ({ name }: { name?: ReactNode }) => (
    <span>{String(name ?? "")}</span>
  ),
  StargateName: ({ name }: { name?: ReactNode }) => (
    <span>{String(name ?? "")}</span>
  ),
  StarName: ({ name }: { name?: ReactNode }) => (
    <span>{String(name ?? "")}</span>
  ),
}));

// ---------------------------------------------------------------------------
// Mock @jitaspace/eve-components. The dumb name components a wrapper renders
// that moved out of @jitaspace/ui are stubbed here as passthroughs.
// ---------------------------------------------------------------------------
jest.mock("@jitaspace/eve-components", () => ({
  // CalendarEventOwnerName branches
  AllianceName: ({ allianceId }: { allianceId?: number }) => (
    <span>{`Alliance ${allianceId ?? ""}`}</span>
  ),
  CorporationName: ({ corporationId }: { corporationId?: number }) => (
    <span>{`Corporation ${corporationId ?? ""}`}</span>
  ),
  CharacterName: ({ characterId }: { characterId?: number }) => (
    <span>{`Character ${characterId ?? ""}`}</span>
  ),
  FactionName: ({ factionId }: { factionId?: number }) => (
    <span>{`Faction ${factionId ?? ""}`}</span>
  ),
  EveEntityName: () => <span>EveEntityName Fallback</span>,

  // War names
  WarAggressorName: ({
    aggressorAllianceId,
    aggressorCorporationId,
  }: {
    aggressorAllianceId?: number;
    aggressorCorporationId?: number;
  }) => (
    <span>{`Aggressor ${aggressorAllianceId ?? ""}/${aggressorCorporationId ?? ""}`}</span>
  ),
  WarDefenderName: ({
    defenderAllianceId,
    defenderCorporationId,
  }: {
    defenderAllianceId?: number;
    defenderCorporationId?: number;
  }) => (
    <span>{`Defender ${defenderAllianceId ?? ""}/${defenderCorporationId ?? ""}`}</span>
  ),
}));

function renderWithMantine(node: ReactNode) {
  return render(<MantineProvider>{node}</MantineProvider>);
}

describe("Text wrappers", () => {
  it("AsteroidBeltName resolves the belt name from the hook", () => {
    renderWithMantine(<AsteroidBeltName asteroidBeltId={1} />);
    expect(screen.getByText("Asteroid Belt Value")).toBeInTheDocument();
  });

  it("CategoryName resolves the category name from the hook", () => {
    renderWithMantine(<CategoryName categoryId={1} />);
    expect(screen.getByText("Category Value")).toBeInTheDocument();
  });

  it("DogmaAttributeName resolves the attribute name from the hook", () => {
    renderWithMantine(<DogmaAttributeName attributeId={1} />);
    expect(screen.getByText("Dogma Attribute Value")).toBeInTheDocument();
  });

  it("DogmaEffectName resolves the effect name from the hook", () => {
    renderWithMantine(<DogmaEffectName effectId={1} />);
    expect(screen.getByText("Dogma Effect Value")).toBeInTheDocument();
  });

  it("GroupName resolves the group name from the hook", () => {
    renderWithMantine(<GroupName groupId={1} />);
    expect(screen.getByText("Group Value")).toBeInTheDocument();
  });

  it("MoonName resolves the moon name from the hook", () => {
    renderWithMantine(<MoonName moonId={1} />);
    expect(screen.getByText("Moon Value")).toBeInTheDocument();
  });

  it("PlanetName resolves the planet name from the hook", () => {
    renderWithMantine(<PlanetName planetId={1} />);
    expect(screen.getByText("Planet Value")).toBeInTheDocument();
  });

  it("StargateName resolves the stargate name from the hook", () => {
    renderWithMantine(<StargateName stargateId={1} />);
    expect(screen.getByText("Stargate Value")).toBeInTheDocument();
  });

  it("StarName resolves the star name from the hook", () => {
    renderWithMantine(<StarName starId={1} />);
    expect(screen.getByText("Star Value")).toBeInTheDocument();
  });

  it("BloodlineName resolves the bloodline name (un-nested data) from the hook", () => {
    renderWithMantine(<BloodlineName bloodlineId={1} />);
    expect(screen.getByText("Bloodline Value")).toBeInTheDocument();
  });

  it("RaceName resolves the race name (un-nested data) from the hook", () => {
    renderWithMantine(<RaceName raceId={1} />);
    expect(screen.getByText("Race Value")).toBeInTheDocument();
  });

  it("MarketGroupName resolves the name off the returned object directly", () => {
    renderWithMantine(<MarketGroupName marketGroupId={1} />);
    expect(screen.getByText("Market Group Value")).toBeInTheDocument();
  });

  it("LabelName finds the matching label by id", () => {
    renderWithMantine(<LabelName characterId={1} labelId={42} />);
    expect(screen.getByText("Label Value")).toBeInTheDocument();
  });

  it("MailingListName finds the matching mailing list by id", () => {
    renderWithMantine(<MailingListName characterId={1} mailingListId={99} />);
    expect(screen.getByText("Mailing List Value")).toBeInTheDocument();
  });

  it("WarAggressorName forwards the aggressor alliance/corporation ids", () => {
    renderWithMantine(<WarAggressorName warId={1} />);
    expect(screen.getByText("Aggressor 5005/6006")).toBeInTheDocument();
  });

  it("WarDefenderName forwards the defender alliance/corporation ids", () => {
    renderWithMantine(<WarDefenderName warId={1} />);
    expect(screen.getByText("Defender 7007/8008")).toBeInTheDocument();
  });

  describe("CalendarEventOwnerName", () => {
    it("renders AllianceName when owner_type is alliance", () => {
      renderWithMantine(<CalendarEventOwnerName characterId={1} eventId={1} />);
      expect(screen.getByText("Alliance 1001")).toBeInTheDocument();
    });

    it("renders CorporationName when owner_type is corporation", () => {
      renderWithMantine(<CalendarEventOwnerName characterId={1} eventId={2} />);
      expect(screen.getByText("Corporation 2002")).toBeInTheDocument();
    });

    it("renders CharacterName when owner_type is character", () => {
      renderWithMantine(<CalendarEventOwnerName characterId={1} eventId={3} />);
      expect(screen.getByText("Character 3003")).toBeInTheDocument();
    });

    it("renders FactionName when owner_type is faction", () => {
      renderWithMantine(<CalendarEventOwnerName characterId={1} eventId={4} />);
      expect(screen.getByText("Faction 4004")).toBeInTheDocument();
    });

    it("falls back to EveEntityName when owner_type is unknown", () => {
      renderWithMantine(
        <CalendarEventOwnerName characterId={1} eventId={999} />,
      );
      expect(screen.getByText("EveEntityName Fallback")).toBeInTheDocument();
    });
  });

  // Exercise the `?? 0` / undefined-id fallback branches by omitting the id
  // prop. The mocked hooks ignore their argument, so they still resolve a
  // value and we can assert it renders.
  describe("with omitted ids (fallback branch)", () => {
    it("AsteroidBeltName uses the 0 fallback when no id is given", () => {
      renderWithMantine(<AsteroidBeltName />);
      expect(screen.getByText("Asteroid Belt Value")).toBeInTheDocument();
    });

    it("CategoryName uses the 0 fallback when no id is given", () => {
      renderWithMantine(<CategoryName />);
      expect(screen.getByText("Category Value")).toBeInTheDocument();
    });

    it("DogmaAttributeName uses the 0 fallback when no id is given", () => {
      renderWithMantine(<DogmaAttributeName />);
      expect(screen.getByText("Dogma Attribute Value")).toBeInTheDocument();
    });

    it("DogmaEffectName uses the 0 fallback when no id is given", () => {
      renderWithMantine(<DogmaEffectName />);
      expect(screen.getByText("Dogma Effect Value")).toBeInTheDocument();
    });

    it("GroupName uses the 0 fallback when no id is given", () => {
      renderWithMantine(<GroupName />);
      expect(screen.getByText("Group Value")).toBeInTheDocument();
    });

    it("MoonName uses the 0 fallback when no id is given", () => {
      renderWithMantine(<MoonName />);
      expect(screen.getByText("Moon Value")).toBeInTheDocument();
    });

    it("PlanetName uses the 0 fallback when no id is given", () => {
      renderWithMantine(<PlanetName />);
      expect(screen.getByText("Planet Value")).toBeInTheDocument();
    });

    it("StargateName uses the 0 fallback when no id is given", () => {
      renderWithMantine(<StargateName />);
      expect(screen.getByText("Stargate Value")).toBeInTheDocument();
    });

    it("StarName uses the 0 fallback when no id is given", () => {
      renderWithMantine(<StarName />);
      expect(screen.getByText("Star Value")).toBeInTheDocument();
    });

    it("BloodlineName uses the 0 fallback when no id is given", () => {
      renderWithMantine(<BloodlineName />);
      expect(screen.getByText("Bloodline Value")).toBeInTheDocument();
    });

    it("RaceName uses the 0 fallback when no id is given", () => {
      renderWithMantine(<RaceName />);
      expect(screen.getByText("Race Value")).toBeInTheDocument();
    });

    it("MarketGroupName uses the 0 fallback when no id is given", () => {
      renderWithMantine(<MarketGroupName />);
      expect(screen.getByText("Market Group Value")).toBeInTheDocument();
    });

    it("LabelName renders empty when no label matches the id", () => {
      const { container } = renderWithMantine(<LabelName />);
      expect(container.querySelector("span")).toBeEmptyDOMElement();
    });

    it("MailingListName renders empty when no mailing list matches the id", () => {
      const { container } = renderWithMantine(<MailingListName />);
      expect(container.querySelector("span")).toBeEmptyDOMElement();
    });

    it("WarAggressorName uses the 0 fallback when no warId is given", () => {
      renderWithMantine(<WarAggressorName />);
      expect(screen.getByText("Aggressor 5005/6006")).toBeInTheDocument();
    });

    it("WarDefenderName uses the 0 fallback when no warId is given", () => {
      renderWithMantine(<WarDefenderName />);
      expect(screen.getByText("Defender 7007/8008")).toBeInTheDocument();
    });
  });
});
