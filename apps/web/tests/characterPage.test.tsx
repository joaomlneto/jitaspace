import "@testing-library/jest-dom/jest-globals";

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";

const CHARACTER_ID = 30000142;

const mockUseCharacter = jest.fn();
const mockUseSelectedCharacter = jest.fn();
const mockUseGetNpcCorporationDivisionById = jest.fn();
const mockUseAuthenticatedCharacter = jest.fn();
const mockUseCharacterSkills = jest.fn();
const mockUseCharacterWalletBalance = jest.fn();
const mockUseCorporationHistory = jest.fn();

// page.tsx imports getCharactersCharacterId for generateMetadata; page.client
// imports useGetCharactersCharacterIdCorporationhistory for the timeline.
jest.mock("@jitaspace/esi-client", () => ({
  getCharactersCharacterId: jest
    .fn()
    .mockResolvedValue({ data: { name: "Test" } }),
  useGetCharactersCharacterIdCorporationhistory: (...args: unknown[]) =>
    mockUseCorporationHistory(...args),
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ characterId: String(CHARACTER_ID) }),
  useRouter: () => ({}),
  usePathname: () => "/",
}));

jest.mock("@jitaspace/hooks", () => ({
  useCharacter: (...args: unknown[]) => mockUseCharacter(...args),
  useSelectedCharacter: () => mockUseSelectedCharacter(),
  useAuthenticatedCharacter: (...args: unknown[]) =>
    mockUseAuthenticatedCharacter(...args),
  useCharacterSkills: (...args: unknown[]) => mockUseCharacterSkills(...args),
}));

// Imported via its deep path (not re-exported from the package root).
jest.mock(
  "@jitaspace/hooks/src/hooks/character/useCharacterWalletBalance",
  () => ({
    useCharacterWalletBalance: (...args: unknown[]) =>
      mockUseCharacterWalletBalance(...args),
  }),
);

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

jest.mock("~/components/Card", () => ({
  CharacterLocationCard: () => <div data-testid="location-card" />,
  CharacterSkillTrainingCard: () => <div data-testid="skill-training-card" />,
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
    mockUseAuthenticatedCharacter.mockReset();
    mockUseCharacterSkills.mockReset();
    mockUseCharacterWalletBalance.mockReset();
    mockUseCorporationHistory.mockReset();

    // Sensible defaults — individual tests override as needed.
    mockUseGetNpcCorporationDivisionById.mockReturnValue({
      data: { data: { name: { en: "Distribution" } } },
    });
    mockUseAuthenticatedCharacter.mockReturnValue(null);
    mockUseCharacterSkills.mockReturnValue({ hasToken: false });
    mockUseCharacterWalletBalance.mockReturnValue({ isAllowed: false });
    mockUseCorporationHistory.mockReturnValue({
      data: { data: [] },
      isLoading: false,
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
        solarSystemId: 30000142,
        typeId: 587,
        researchSkills: [11442, 11443],
        corporationId: 1000035,
        allianceId: 99000001,
        factionId: 500001,
        gender: "male",
        securityStatus: 1.5,
        birthday: new Date("2003-05-06T00:00:00Z"),
        bloodlineId: 1,
        raceId: 1,
        title: "<b>The</b> Agent",
        description: "An EVE agent",
      },
    });
    mockUseCorporationHistory.mockReturnValue({
      data: {
        data: [
          {
            corporation_id: 1000035,
            record_id: 3,
            start_date: "2010-01-01T00:00:00Z",
            is_deleted: false,
          },
          {
            corporation_id: 2000,
            record_id: 2,
            start_date: "2008-01-01T00:00:00Z",
            is_deleted: true,
          },
          { corporation_id: 3000, record_id: 1, start_date: "2005-01-01T00:00:00Z" },
        ],
      },
      isLoading: false,
    });

    const { container } = renderPage();

    expect(mockUseCharacter).toHaveBeenCalledWith(CHARACTER_ID);
    // agent division hook called with the division id, query enabled
    expect(mockUseGetNpcCorporationDivisionById).toHaveBeenCalledWith(22, {
      query: { enabled: true },
    });

    // Info window renders because a character is selected
    expect(screen.getAllByTestId("info-window").length).toBeGreaterThanOrEqual(
      1,
    );

    // Title has its EVE-HTML tags stripped
    expect(screen.getByText("The Agent")).toBeInTheDocument();

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

    // Affiliations render as links in the hero
    expect(
      container.querySelector('a[href="/corporation/1000035"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('a[href="/alliance/99000001"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('a[href="/faction/500001"]'),
    ).toBeInTheDocument();

    // Details sidebar
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Security Status")).toBeInTheDocument();
    expect(screen.getByText("1.50")).toBeInTheDocument();
    expect(screen.getByText("Born")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByText("Gender")).toBeInTheDocument();
    expect(screen.getByText("male")).toBeInTheDocument();
    expect(screen.getByText("Race")).toBeInTheDocument();
    expect(screen.getByText("Race#1")).toBeInTheDocument();
    expect(screen.getByText("Bloodline")).toBeInTheDocument();
    expect(screen.getByText("Faction")).toBeInTheDocument();

    // Agent-specific rows (relabelled from the old page)
    expect(screen.getByText("Agent Details")).toBeInTheDocument();
    expect(screen.getByText("Division")).toBeInTheDocument();
    expect(screen.getByText("Distribution")).toBeInTheDocument();
    expect(screen.getByText("Agent Type")).toBeInTheDocument();
    expect(screen.getByText("Level")).toBeInTheDocument();
    expect(screen.getByText("Locator Agent")).toBeInTheDocument();
    expect(screen.getByText("Station")).toBeInTheDocument();
    expect(screen.getByText("Research Skills")).toBeInTheDocument();

    // isInSpace branch rows
    expect(screen.getByText("Solar System")).toBeInTheDocument();
    expect(screen.getByText("Ship")).toBeInTheDocument();
    // Rows dropped in the redesign
    expect(screen.queryByText("Dungeon")).not.toBeInTheDocument();
    expect(screen.queryByText("Spawn Point")).not.toBeInTheDocument();

    // Description sanitized through tiptap-eve and shown in the mail viewer
    expect(screen.getByTestId("mail-viewer")).toHaveTextContent(
      "sanitized:An EVE agent",
    );

    // Employment history timeline
    expect(screen.getByText("Employment History")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
    expect(
      container.querySelector('a[href="/corporation/3000"]'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No employment history available."),
    ).not.toBeInTheDocument();
  });

  it("renders a plain non-agent NPC and skips the optional rows", () => {
    mockUseSelectedCharacter.mockReturnValue(undefined);
    mockUseCharacter.mockReturnValue({
      data: {
        type: "player",
        isNpc: true,
        corporationId: 1000035,
        gender: "female",
        bloodlineId: 2,
        raceId: 2,
        // no alliance / faction / security / birthday / description
      },
    });

    const { container } = renderPage();

    // No selected character -> no info window
    expect(screen.queryByTestId("info-window")).not.toBeInTheDocument();

    // Non-agent NPC badge
    expect(screen.getByText("NPC")).toBeInTheDocument();

    // Female gender branch
    expect(screen.getByText("female")).toBeInTheDocument();

    // Agent rows are hidden
    expect(screen.queryByText("Agent Details")).not.toBeInTheDocument();
    expect(screen.queryByText("Division")).not.toBeInTheDocument();
    expect(screen.queryByText("Solar System")).not.toBeInTheDocument();

    // Corporation shown; alliance & faction hidden
    expect(
      container.querySelector('a[href="/corporation/1000035"]'),
    ).toBeInTheDocument();
    expect(container.querySelector('a[href^="/alliance/"]')).toBeNull();
    expect(container.querySelector('a[href^="/faction/"]')).toBeNull();

    // Optional detail rows hidden when their data is absent
    expect(screen.queryByText("Security Status")).not.toBeInTheDocument();
    expect(screen.queryByText("Born")).not.toBeInTheDocument();
    expect(screen.queryByText("Faction")).not.toBeInTheDocument();

    // No signed-in session -> no Capsuleer Status panel
    expect(screen.queryByText("Capsuleer Status")).not.toBeInTheDocument();

    // Default biography fallback
    expect(screen.getByTestId("mail-viewer")).toHaveTextContent(
      "No biography.",
    );

    // Empty employment history
    expect(
      screen.getByText("No employment history available."),
    ).toBeInTheDocument();
  });

  it("shows the Capsuleer Status panel for an authenticated own character", () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: CHARACTER_ID });
    mockUseAuthenticatedCharacter.mockReturnValue({
      characterId: CHARACTER_ID,
      sessionExpired: false,
    });
    mockUseCharacterWalletBalance.mockReturnValue({
      data: { data: 1234567 },
      isAllowed: true,
    });
    mockUseCharacterSkills.mockReturnValue({
      data: { data: { total_sp: 5000000 } },
      hasToken: true,
    });
    mockUseCharacter.mockReturnValue({
      data: {
        type: "player",
        isNpc: false,
        corporationId: 1000035,
        allianceId: 99000001,
        gender: "male",
        securityStatus: 5,
        birthday: new Date("2010-01-01T00:00:00Z"),
        bloodlineId: 3,
        raceId: 8,
        description: "Capsuleer bio",
      },
    });

    renderPage();

    expect(screen.getByText("Capsuleer Status")).toBeInTheDocument();
    expect(screen.getByText("Wallet")).toBeInTheDocument();
    expect(screen.getByText("Skill Points")).toBeInTheDocument();
    expect(screen.getByText("5,000,000 SP")).toBeInTheDocument();
    expect(screen.getByTestId("location-card")).toBeInTheDocument();
    expect(screen.getByTestId("skill-training-card")).toBeInTheDocument();

    // Regular player -> no NPC/agent badge, and a >=5 security status
    expect(screen.queryByText("NPC")).not.toBeInTheDocument();
    expect(screen.getByText("5.00")).toBeInTheDocument();
  });

  it("renders a graceful shell when character data is undefined", () => {
    mockUseSelectedCharacter.mockReturnValue(undefined);
    mockUseCharacter.mockReturnValue({ data: undefined });
    mockUseCorporationHistory.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    renderPage();

    // Static section headers + always-rendered rows
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Biography")).toBeInTheDocument();
    expect(screen.getByText("Employment History")).toBeInTheDocument();
    expect(screen.getByText("Race")).toBeInTheDocument();
    expect(screen.getByText("Bloodline")).toBeInTheDocument();

    // No badge, no biography viewer (character falsey -> skeleton)
    expect(screen.queryByText("NPC")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mail-viewer")).not.toBeInTheDocument();

    // Employment history is loading -> no empty message yet
    expect(
      screen.queryByText("No employment history available."),
    ).not.toBeInTheDocument();

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

    expect(screen.getByText("Details")).toBeInTheDocument();
  });
});
