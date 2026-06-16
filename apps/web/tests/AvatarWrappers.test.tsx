import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Hook mocks (@jitaspace/hooks)
// ---------------------------------------------------------------------------
const mockUseCalendarEvent = jest.fn();
const mockUseCalendarEventAttendees = jest.fn();
const mockUsePlanet = jest.fn();
const mockUseRace = jest.fn();
const mockUseSolarSystem = jest.fn();
const mockUseStar = jest.fn();
const mockUseStargate = jest.fn();
const mockUseStation = jest.fn();
const mockUseStructure = jest.fn();
const mockUseWar = jest.fn();
const mockUseCharacterMailLabels = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useCalendarEvent: (characterId?: number, eventId?: number) =>
    mockUseCalendarEvent(characterId, eventId),
  useCalendarEventAttendees: (characterId?: number, eventId?: number) =>
    mockUseCalendarEventAttendees(characterId, eventId),
  usePlanet: (planetId: number) => mockUsePlanet(planetId),
  useRace: (raceId: number) => mockUseRace(raceId),
  useSolarSystem: (solarSystemId: number) => mockUseSolarSystem(solarSystemId),
  useStar: (starId: number) => mockUseStar(starId),
  useStargate: (stargateId: number) => mockUseStargate(stargateId),
  useStation: (stationId: number) => mockUseStation(stationId),
  useStructure: (structureId: number, characterId?: number) =>
    mockUseStructure(structureId, characterId),
  useWar: (warId: number) => mockUseWar(warId),
  useCharacterMailLabels: (characterId: number) =>
    mockUseCharacterMailLabels(characterId),
}));

// ---------------------------------------------------------------------------
// UI mocks (@jitaspace/ui) - dumb passthrough stubs that surface the props the
// wrapper feeds them so we can assert the wiring.
// ---------------------------------------------------------------------------
jest.mock("@jitaspace/ui", () => ({
  CalendarEventOwnerAvatar: ({
    ownerId,
    ownerType,
  }: {
    ownerId?: number;
    ownerType?: string;
  }) => (
    <span data-testid="ui-owner-avatar">{`owner ${ownerId} ${ownerType}`}</span>
  ),
  PlanetAvatar: ({ typeId }: { typeId?: number }) => (
    <span data-testid="ui-planet-avatar">{`planet type ${typeId}`}</span>
  ),
  RaceAvatar: ({ factionId }: { factionId?: string }) => (
    <span data-testid="ui-race-avatar">{`race faction ${factionId}`}</span>
  ),
  SolarSystemStarAvatar: ({ typeId }: { typeId?: number }) => (
    <span data-testid="ui-solarsystemstar-avatar">{`solarsystemstar type ${typeId}`}</span>
  ),
  StarAvatar: ({ typeId }: { typeId?: number }) => (
    <span data-testid="ui-star-avatar">{`star type ${typeId}`}</span>
  ),
  StargateAvatar: ({ typeId }: { typeId?: number }) => (
    <span data-testid="ui-stargate-avatar">{`stargate type ${typeId}`}</span>
  ),
  StationAvatar: ({ typeId }: { typeId?: number }) => (
    <span data-testid="ui-station-avatar">{`station type ${typeId}`}</span>
  ),
  StructureAvatar: ({ typeId }: { typeId?: number }) => (
    <span data-testid="ui-structure-avatar">{`structure type ${typeId}`}</span>
  ),
  WarAggressorAvatar: ({
    aggressorAllianceId,
    aggressorCorporationId,
  }: {
    aggressorAllianceId?: number;
    aggressorCorporationId?: number;
  }) => (
    <span data-testid="ui-war-aggressor-avatar">{`aggressor ${aggressorAllianceId} ${aggressorCorporationId}`}</span>
  ),
  WarDefenderAvatar: ({
    defenderAllianceId,
    defenderCorporationId,
  }: {
    defenderAllianceId?: number;
    defenderCorporationId?: number;
  }) => (
    <span data-testid="ui-war-defender-avatar">{`defender ${defenderAllianceId} ${defenderCorporationId}`}</span>
  ),
  MailLabelColorSwatch: ({ color }: { color?: string }) => (
    <span data-testid="ui-maillabel-swatch">{`color ${color}`}</span>
  ),
  CalendarEventHumanDurationText: ({ durationMs }: { durationMs?: number }) => (
    <span data-testid="ui-duration-text">{`duration ${durationMs}`}</span>
  ),
}));

// Components that moved to @jitaspace/eve-components are stubbed there so the
// wrappers (which import them from that package) pick up these stubs.
jest.mock("@jitaspace/eve-components", () => ({
  CalendarEventAttendeesAvatarGroup: ({
    attendees,
    limit,
  }: {
    attendees?: { character_id?: number }[];
    limit?: number;
  }) => (
    <span data-testid="ui-attendees">{`attendees ${
      attendees?.length ?? 0
    } limit ${limit ?? "none"}`}</span>
  ),
}));

const renderWithProvider = (ui: ReactNode) =>
  render(<MantineProvider>{ui}</MantineProvider>);

const allMocks = [
  mockUseCalendarEvent,
  mockUseCalendarEventAttendees,
  mockUsePlanet,
  mockUseRace,
  mockUseSolarSystem,
  mockUseStar,
  mockUseStargate,
  mockUseStation,
  mockUseStructure,
  mockUseWar,
  mockUseCharacterMailLabels,
];

beforeEach(() => {
  allMocks.forEach((m) => m.mockReset());
  // Sensible default so a hook that is not the focus of a test never throws.
  allMocks.forEach((m) => m.mockReturnValue({ data: undefined }));
});

describe("Avatar wrappers", () => {
  it("CalendarEventOwnerAvatar passes owner id/type from the event", () => {
    mockUseCalendarEvent.mockReturnValue({
      data: { data: { owner_id: 98765, owner_type: "corporation" } },
    });

    const { CalendarEventOwnerAvatar } = require("~/components/Avatar");
    renderWithProvider(
      <CalendarEventOwnerAvatar characterId={1} eventId={2} />,
    );

    expect(mockUseCalendarEvent).toHaveBeenCalledWith(1, 2);
    expect(screen.getByTestId("ui-owner-avatar")).toHaveTextContent(
      "owner 98765 corporation",
    );
  });

  it("PlanetAvatar passes the planet type id", () => {
    mockUsePlanet.mockReturnValue({ data: { data: { type_id: 2016 } } });

    const { PlanetAvatar } = require("~/components/Avatar");
    renderWithProvider(<PlanetAvatar planetId={40000001} />);

    expect(mockUsePlanet).toHaveBeenCalledWith(40000001);
    expect(screen.getByTestId("ui-planet-avatar")).toHaveTextContent(
      "planet type 2016",
    );
  });

  it("PlanetAvatar defaults the planet id to 0 when omitted", () => {
    mockUsePlanet.mockReturnValue({ data: { data: { type_id: 13 } } });

    const { PlanetAvatar } = require("~/components/Avatar");
    renderWithProvider(<PlanetAvatar />);

    expect(mockUsePlanet).toHaveBeenCalledWith(0);
    expect(screen.getByTestId("ui-planet-avatar")).toBeInTheDocument();
  });

  it("RaceAvatar passes the faction id as a string (off race.faction_id)", () => {
    // The wrapper destructures `data: race`, so the faction lives under `.data`.
    mockUseRace.mockReturnValue({ data: { faction_id: 500001 } });

    const { RaceAvatar } = require("~/components/Avatar");
    renderWithProvider(<RaceAvatar raceId={1} />);

    expect(mockUseRace).toHaveBeenCalledWith(1);
    expect(screen.getByTestId("ui-race-avatar")).toHaveTextContent(
      "race faction 500001",
    );
  });

  it("RaceAvatar tolerates a missing race (defaults id to 0)", () => {
    mockUseRace.mockReturnValue({ data: undefined });

    const { RaceAvatar } = require("~/components/Avatar");
    renderWithProvider(<RaceAvatar />);

    expect(mockUseRace).toHaveBeenCalledWith(0);
    expect(screen.getByTestId("ui-race-avatar")).toHaveTextContent(
      "race faction undefined",
    );
  });

  it("SolarSystemStarAvatar resolves the star via the solar system then passes its type id", () => {
    mockUseSolarSystem.mockReturnValue({
      data: { data: { star_id: 40000002 } },
    });
    mockUseStar.mockReturnValue({ data: { data: { type_id: 3800 } } });

    const { SolarSystemStarAvatar } = require("~/components/Avatar");
    renderWithProvider(<SolarSystemStarAvatar solarSystemId={30000142} />);

    expect(mockUseSolarSystem).toHaveBeenCalledWith(30000142);
    expect(mockUseStar).toHaveBeenCalledWith(40000002);
    expect(screen.getByTestId("ui-solarsystemstar-avatar")).toHaveTextContent(
      "solarsystemstar type 3800",
    );
  });

  it("StarAvatar passes the star type id", () => {
    mockUseStar.mockReturnValue({ data: { data: { type_id: 45031 } } });

    const { StarAvatar } = require("~/components/Avatar");
    renderWithProvider(<StarAvatar starId={40000002} />);

    expect(mockUseStar).toHaveBeenCalledWith(40000002);
    expect(screen.getByTestId("ui-star-avatar")).toHaveTextContent(
      "star type 45031",
    );
  });

  it("StargateAvatar passes the stargate type id", () => {
    mockUseStargate.mockReturnValue({ data: { data: { type_id: 29624 } } });

    const { StargateAvatar } = require("~/components/Avatar");
    renderWithProvider(<StargateAvatar stargateId={50000056} />);

    expect(mockUseStargate).toHaveBeenCalledWith(50000056);
    expect(screen.getByTestId("ui-stargate-avatar")).toHaveTextContent(
      "stargate type 29624",
    );
  });

  it("StationAvatar passes the station type id", () => {
    mockUseStation.mockReturnValue({ data: { data: { type_id: 1531 } } });

    const { StationAvatar } = require("~/components/Avatar");
    renderWithProvider(<StationAvatar stationId={60003760} />);

    expect(mockUseStation).toHaveBeenCalledWith(60003760);
    expect(screen.getByTestId("ui-station-avatar")).toHaveTextContent(
      "station type 1531",
    );
  });

  it("StructureAvatar passes the structure type id and forwards the character id", () => {
    mockUseStructure.mockReturnValue({ data: { data: { type_id: 35832 } } });

    const { StructureAvatar } = require("~/components/Avatar");
    renderWithProvider(
      <StructureAvatar structureId={1234567890123} characterId={42} />,
    );

    expect(mockUseStructure).toHaveBeenCalledWith(1234567890123, 42);
    expect(screen.getByTestId("ui-structure-avatar")).toHaveTextContent(
      "structure type 35832",
    );
  });

  it("WarAggressorAvatar passes the aggressor alliance/corporation ids", () => {
    mockUseWar.mockReturnValue({
      data: {
        data: {
          aggressor: { alliance_id: 99005338, corporation_id: 1000169 },
          defender: { alliance_id: 99003581, corporation_id: 1000170 },
        },
      },
    });

    const { WarAggressorAvatar } = require("~/components/Avatar");
    renderWithProvider(<WarAggressorAvatar warId={123} />);

    expect(mockUseWar).toHaveBeenCalledWith(123);
    expect(screen.getByTestId("ui-war-aggressor-avatar")).toHaveTextContent(
      "aggressor 99005338 1000169",
    );
  });

  it("WarDefenderAvatar passes the defender alliance/corporation ids", () => {
    mockUseWar.mockReturnValue({
      data: {
        data: {
          aggressor: { alliance_id: 99005338, corporation_id: 1000169 },
          defender: { alliance_id: 99003581, corporation_id: 1000170 },
        },
      },
    });

    const { WarDefenderAvatar } = require("~/components/Avatar");
    renderWithProvider(<WarDefenderAvatar warId={456} />);

    expect(mockUseWar).toHaveBeenCalledWith(456);
    expect(screen.getByTestId("ui-war-defender-avatar")).toHaveTextContent(
      "defender 99003581 1000170",
    );
  });

  // ---- "no data yet" / omitted-id paths (exercise the ?? 0 and ?. fallbacks)
  it("renders every id-based avatar with no data and no id (loading state)", () => {
    // All hooks return { data: undefined } from beforeEach.
    const {
      PlanetAvatar,
      SolarSystemStarAvatar,
      StarAvatar,
      StargateAvatar,
      StationAvatar,
      StructureAvatar,
    } = require("~/components/Avatar");

    renderWithProvider(
      <div>
        <PlanetAvatar />
        <SolarSystemStarAvatar />
        <StarAvatar />
        <StargateAvatar />
        <StationAvatar />
        <StructureAvatar />
      </div>,
    );

    // Each defaults its lookup id to 0 when the prop is omitted.
    expect(mockUsePlanet).toHaveBeenCalledWith(0);
    expect(mockUseSolarSystem).toHaveBeenCalledWith(0);
    // StarAvatar (0) + SolarSystemStarAvatar's inner useStar (0, no star_id).
    expect(mockUseStar).toHaveBeenCalledWith(0);
    expect(mockUseStargate).toHaveBeenCalledWith(0);
    expect(mockUseStation).toHaveBeenCalledWith(0);
    expect(mockUseStructure).toHaveBeenCalledWith(0, undefined);

    expect(screen.getByTestId("ui-planet-avatar")).toHaveTextContent(
      "planet type undefined",
    );
    expect(screen.getByTestId("ui-solarsystemstar-avatar")).toHaveTextContent(
      "solarsystemstar type undefined",
    );
    expect(screen.getByTestId("ui-star-avatar")).toHaveTextContent(
      "star type undefined",
    );
    expect(screen.getByTestId("ui-stargate-avatar")).toHaveTextContent(
      "stargate type undefined",
    );
    expect(screen.getByTestId("ui-station-avatar")).toHaveTextContent(
      "station type undefined",
    );
    expect(screen.getByTestId("ui-structure-avatar")).toHaveTextContent(
      "structure type undefined",
    );
  });

  it("CalendarEventOwnerAvatar tolerates an undefined event", () => {
    mockUseCalendarEvent.mockReturnValue({ data: undefined });

    const { CalendarEventOwnerAvatar } = require("~/components/Avatar");
    renderWithProvider(<CalendarEventOwnerAvatar />);

    expect(screen.getByTestId("ui-owner-avatar")).toHaveTextContent(
      "owner undefined undefined",
    );
  });

  it("WarAggressorAvatar tolerates an undefined war", () => {
    mockUseWar.mockReturnValue({ data: undefined });

    const { WarAggressorAvatar } = require("~/components/Avatar");
    renderWithProvider(<WarAggressorAvatar />);

    expect(mockUseWar).toHaveBeenCalledWith(0);
    expect(screen.getByTestId("ui-war-aggressor-avatar")).toHaveTextContent(
      "aggressor undefined undefined",
    );
  });

  it("WarDefenderAvatar tolerates an undefined war", () => {
    mockUseWar.mockReturnValue({ data: undefined });

    const { WarDefenderAvatar } = require("~/components/Avatar");
    renderWithProvider(<WarDefenderAvatar />);

    expect(mockUseWar).toHaveBeenCalledWith(0);
    expect(screen.getByTestId("ui-war-defender-avatar")).toHaveTextContent(
      "defender undefined undefined",
    );
  });
});

describe("AvatarGroup wrappers", () => {
  it("CalendarEventAttendeesAvatarGroup forwards the attendees list and limit", () => {
    mockUseCalendarEventAttendees.mockReturnValue({
      data: {
        data: [
          { character_id: 1, event_response: "accepted" },
          { character_id: 2, event_response: "tentative" },
          { character_id: 3, event_response: "declined" },
        ],
      },
    });

    const {
      CalendarEventAttendeesAvatarGroup,
    } = require("~/components/AvatarGroup");
    renderWithProvider(
      <CalendarEventAttendeesAvatarGroup
        characterId={7}
        eventId={8}
        limit={2}
      />,
    );

    expect(mockUseCalendarEventAttendees).toHaveBeenCalledWith(7, 8);
    expect(screen.getByTestId("ui-attendees")).toHaveTextContent(
      "attendees 3 limit 2",
    );
  });

  it("CalendarEventAttendeesAvatarGroup handles undefined attendees gracefully", () => {
    mockUseCalendarEventAttendees.mockReturnValue({ data: undefined });

    const {
      CalendarEventAttendeesAvatarGroup,
    } = require("~/components/AvatarGroup");
    renderWithProvider(<CalendarEventAttendeesAvatarGroup />);

    expect(screen.getByTestId("ui-attendees")).toHaveTextContent(
      "attendees 0 limit none",
    );
  });
});

describe("ColorSwatch wrappers", () => {
  it("MailLabelColorSwatch passes the matching label color", () => {
    mockUseCharacterMailLabels.mockReturnValue({
      data: {
        data: {
          labels: [
            { label_id: 1, color: "#ffffff", name: "Inbox" },
            { label_id: 2, color: "#ff6600", name: "Important" },
          ],
        },
      },
    });

    const { MailLabelColorSwatch } = require("~/components/ColorSwatch");
    renderWithProvider(<MailLabelColorSwatch characterId={99} labelId={2} />);

    expect(mockUseCharacterMailLabels).toHaveBeenCalledWith(99);
    expect(screen.getByTestId("ui-maillabel-swatch")).toHaveTextContent(
      "color #ff6600",
    );
  });

  it("MailLabelColorSwatch passes undefined color when the label is not found", () => {
    mockUseCharacterMailLabels.mockReturnValue({
      data: { data: { labels: [{ label_id: 1, color: "#ffffff" }] } },
    });

    const { MailLabelColorSwatch } = require("~/components/ColorSwatch");
    renderWithProvider(<MailLabelColorSwatch labelId={999} />);

    // characterId omitted -> defaults to 0
    expect(mockUseCharacterMailLabels).toHaveBeenCalledWith(0);
    expect(screen.getByTestId("ui-maillabel-swatch")).toHaveTextContent(
      "color undefined",
    );
  });
});

describe("DurationText wrappers", () => {
  it("CalendarEventHumanDurationText converts the duration (minutes) to milliseconds", () => {
    mockUseCalendarEvent.mockReturnValue({
      data: { data: { duration: 60 } },
    });

    const {
      CalendarEventHumanDurationText,
    } = require("~/components/DurationText");
    renderWithProvider(
      <CalendarEventHumanDurationText characterId={3} eventId={4} />,
    );

    expect(mockUseCalendarEvent).toHaveBeenCalledWith(3, 4);
    // 60 minutes * 60 * 1000 = 3_600_000 ms
    expect(screen.getByTestId("ui-duration-text")).toHaveTextContent(
      "duration 3600000",
    );
  });

  it("CalendarEventHumanDurationText passes undefined when no duration is present", () => {
    mockUseCalendarEvent.mockReturnValue({ data: { data: {} } });

    const {
      CalendarEventHumanDurationText,
    } = require("~/components/DurationText");
    renderWithProvider(<CalendarEventHumanDurationText />);

    expect(screen.getByTestId("ui-duration-text")).toHaveTextContent(
      "duration undefined",
    );
  });
});
