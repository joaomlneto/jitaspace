import "@testing-library/jest-dom/jest-globals";

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";

const CHARACTER_ID = 30000142;

const mockUseCharacter = jest.fn();
const mockUseSelectedCharacter = jest.fn();
const mockUseGetNpcCorporationDivisionById = jest.fn();

// character/[characterId]/page.tsx imports getCharactersCharacterId for generateMetadata
jest.mock("@jitaspace/esi-client", () => ({
  getCharactersCharacterId: jest
    .fn()
    .mockResolvedValue({ data: { name: "Test" } }),
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ characterId: String(CHARACTER_ID) }),
  useRouter: () => ({}),
  usePathname: () => "/",
}));

jest.mock("@jitaspace/hooks", () => ({
  useCharacter: (...args: unknown[]) => mockUseCharacter(...args),
  useSelectedCharacter: () => mockUseSelectedCharacter(),
}));

jest.mock("@jitaspace/sde-client", () => ({
  useGetNpcCorporationDivisionById: (...args: unknown[]) =>
    mockUseGetNpcCorporationDivisionById(...args),
}));

jest.mock("@jitaspace/tiptap-eve", () => ({
  sanitizeFormattedEveString: (s: string) => `sanitized:${s}`,
}));

jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));

jest.mock("~/components/ActionIcon", () => ({
  OpenInformationWindowActionIcon: () => <div data-testid="info-window" />,
}));

jest.mock("~/components/Avatar", () => ({
  StationAvatar: () => null,
}));

jest.mock("~/components/Text", () => ({
  BloodlineName: ({ bloodlineId }: { bloodlineId?: number }) => (
    <span>{`Bloodline#${bloodlineId}`}</span>
  ),
  RaceName: ({ raceId }: { raceId?: number }) => (
    <span>{`Race#${raceId}`}</span>
  ),
}));

jest.mock("~/components/EveMail", () => ({
  MailMessageViewer: ({ content }: { content?: string }) => (
    <div data-testid="mail-viewer">{content}</div>
  ),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href?: string | object;
    children?: ReactNode;
  }) => <a href={typeof href === "string" ? href : ""}>{children}</a>,
}));

function renderPage() {
  const Page = require("~/app/character/[characterId]/page.client").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
  );
}

describe("Character page", () => {
  beforeEach(() => {
    mockUseCharacter.mockReset();
    mockUseSelectedCharacter.mockReset();
    mockUseGetNpcCorporationDivisionById.mockReset();
    mockUseGetNpcCorporationDivisionById.mockReturnValue({
      data: { data: { name: { en: "Distribution" } } },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a full NPC research agent in space (every branch)", () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 123456789 });
    mockUseCharacter.mockReturnValue({
      data: {
        type: "agent",
        isNpc: true,
        isResearchAgent: true,
        agentDivisionId: 22,
        agentTypeId: 3,
        isLocator: true,
        level: 4,
        locationId: 60000001,
        isInSpace: true,
        dungeonId: 111,
        spawnPointId: 222,
        solarSystemId: 30000142,
        typeId: 587,
        researchSkills: [11442, 11443],
        corporationId: 1000035,
        allianceId: 99000001,
        gender: "male",
        securityStatus: 1.5,
        birthday: new Date("2003-05-06T00:00:00Z"),
        bloodlineId: 1,
        raceId: 1,
        description: "An EVE agent",
      },
    });

    renderPage();

    expect(mockUseCharacter).toHaveBeenCalledWith(CHARACTER_ID);
    // agent division hook called with the division id, query enabled
    expect(mockUseGetNpcCorporationDivisionById).toHaveBeenCalledWith(22, {
      query: { enabled: true },
    });

    // Info window renders because a character is selected
    expect(screen.getAllByTestId("info-window").length).toBeGreaterThanOrEqual(
      1,
    );

    // NPC research agent badge
    expect(screen.getByText("Research Agent")).toBeInTheDocument();

    // External links
    expect(screen.getByRole("link", { name: /EveWho/ })).toHaveAttribute(
      "href",
      `https://evewho.com/character/${CHARACTER_ID}`,
    );
    expect(screen.getByRole("link", { name: /zKillboard/ })).toHaveAttribute(
      "href",
      `https://zkillboard.com/character/${CHARACTER_ID}`,
    );

    // Optional relationship rows
    expect(screen.getByText("Corporation")).toBeInTheDocument();
    expect(screen.getByText("Alliance")).toBeInTheDocument();
    expect(screen.getByText("Gender")).toBeInTheDocument();
    expect(screen.getByText("Male")).toBeInTheDocument();
    expect(screen.getByText("Security Status")).toBeInTheDocument();
    expect(screen.getByText("1.5")).toBeInTheDocument();
    expect(screen.getByText("Birthday")).toBeInTheDocument();
    expect(screen.getByText("Bloodline")).toBeInTheDocument();
    expect(screen.getByText("Race")).toBeInTheDocument();

    // Agent-specific rows
    expect(screen.getByText("Agent Division")).toBeInTheDocument();
    expect(screen.getByText("Distribution")).toBeInTheDocument();
    expect(screen.getByText("Agent Type")).toBeInTheDocument();
    expect(screen.getByText("Is Locator Agent?")).toBeInTheDocument();
    expect(screen.getByText("Agent Level")).toBeInTheDocument();
    expect(screen.getByText("Agent Station")).toBeInTheDocument();
    expect(screen.getByText("Research Agent Skills")).toBeInTheDocument();

    // isInSpace branch rows
    expect(screen.getByText("Dungeon")).toBeInTheDocument();
    expect(screen.getByText("Spawn Point")).toBeInTheDocument();
    expect(screen.getByText("Solar System")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();

    // Description sanitized through tiptap-eve and shown in the mail viewer
    expect(screen.getByTestId("mail-viewer")).toHaveTextContent(
      "sanitized:An EVE agent",
    );
  });

  it("renders a plain non-agent NPC badge and skips agent rows", () => {
    mockUseSelectedCharacter.mockReturnValue(undefined);
    mockUseCharacter.mockReturnValue({
      data: {
        type: "npc",
        isNpc: true,
        corporationId: 1000035,
        gender: "female",
        bloodlineId: 2,
        raceId: 2,
        // no description -> "No description"
      },
    });

    renderPage();

    // No selected character -> no info window
    expect(screen.queryByTestId("info-window")).not.toBeInTheDocument();

    // Non-agent NPC badge
    expect(screen.getByText("NPC")).toBeInTheDocument();

    // Female gender branch
    expect(screen.getByText("Female")).toBeInTheDocument();

    // Agent rows are hidden
    expect(screen.queryByText("Agent Division")).not.toBeInTheDocument();
    expect(screen.queryByText("Dungeon")).not.toBeInTheDocument();

    // Alliance row hidden (no allianceId), Corporation shown
    expect(screen.getByText("Corporation")).toBeInTheDocument();
    expect(screen.queryByText("Alliance")).not.toBeInTheDocument();

    // Default description fallback
    expect(screen.getByTestId("mail-viewer")).toHaveTextContent(
      "No description",
    );
  });

  it("renders nothing meaningful when character data is undefined", () => {
    mockUseSelectedCharacter.mockReturnValue(undefined);
    mockUseCharacter.mockReturnValue({ data: undefined });

    renderPage();

    // Static rows still render
    expect(screen.getByText("Bloodline")).toBeInTheDocument();
    expect(screen.getByText("Race")).toBeInTheDocument();
    // No badge, no relationship rows, no mail viewer (character falsey)
    expect(screen.queryByText("NPC")).not.toBeInTheDocument();
    expect(screen.queryByText("Corporation")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mail-viewer")).not.toBeInTheDocument();
    // agent division hook disabled
    expect(mockUseGetNpcCorporationDivisionById).toHaveBeenCalledWith(0, {
      query: { enabled: false },
    });
  });

  it("renders the server wrapper (page.tsx) inside a Suspense boundary", () => {
    mockUseSelectedCharacter.mockReturnValue(undefined);
    mockUseCharacter.mockReturnValue({ data: undefined });

    const WrapperPage = require("~/app/character/[characterId]/page").default;
    render(
      <MantineProvider>
        <WrapperPage />
      </MantineProvider>,
    );

    expect(screen.getByText("Bloodline")).toBeInTheDocument();
  });
});
