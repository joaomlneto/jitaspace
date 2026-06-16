import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Hook mocks — every Card pulls its data from @jitaspace/hooks.
// ---------------------------------------------------------------------------
const mockUseEsiAllianceInformation = jest.fn();
const mockUseEsiAllianceMemberCorporations = jest.fn();
const mockUseCharacter = jest.fn();
const mockUseEsiName = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useEsiAllianceInformation: (...a: unknown[]) =>
    mockUseEsiAllianceInformation(...a),
  useEsiAllianceMemberCorporations: (...a: unknown[]) =>
    mockUseEsiAllianceMemberCorporations(...a),
  useCharacter: (...a: unknown[]) => mockUseCharacter(...a),
  useEsiName: (...a: unknown[]) => mockUseEsiName(...a),
}));

// ---------------------------------------------------------------------------
// Lightweight stand-ins for the leaf presentational packages so we don't drag
// in the full ESI name-resolution / image-server machinery.
// ---------------------------------------------------------------------------
// Pure leaves (avatars + FormattedDateText) live in @jitaspace/ui; the smart
// Card components import them from there. Keep every other real ui export
// (Card, Badge, AllianceAnchor, CorporationAnchor, …) and only stub the few
// the assertions rely on. The moved leaves (CharacterAnchor, *Name,
// EveEntityAvatar) are imported relatively and stubbed via the relative mocks
// below.
jest.mock("@jitaspace/ui", () => ({
  ...jest.requireActual<typeof import("@jitaspace/ui")>("@jitaspace/ui"),
  AllianceAvatar: ({ allianceId }: { allianceId: number | string }) => (
    <span data-testid="alliance-avatar">{`AllianceAvatar ${allianceId}`}</span>
  ),
  CharacterAvatar: ({ characterId }: { characterId: number | string }) => (
    <span data-testid="character-avatar">{`CharacterAvatar ${characterId}`}</span>
  ),
  CorporationAvatar: ({
    corporationId,
  }: {
    corporationId: number | string;
  }) => (
    <span data-testid="corporation-avatar">{`CorporationAvatar ${corporationId}`}</span>
  ),
  FormattedDateText: ({ date }: { date: Date }) => (
    <span>{`Date ${date.toISOString()}`}</span>
  ),
}));

jest.mock("../../Anchor", () => ({
  CharacterAnchor: ({ children }: { children?: ReactNode }) => (
    <a href="#character">{children}</a>
  ),
}));

jest.mock("../../Avatar", () => ({
  EveEntityAvatar: ({ entityId }: { entityId: number | string }) => (
    <span data-testid="entity-avatar">{`EntityAvatar ${entityId}`}</span>
  ),
}));

jest.mock("../../Text", () => ({
  AllianceName: ({ allianceId }: { allianceId: number | string }) => (
    <span>{`Alliance ${allianceId}`}</span>
  ),
  CharacterName: ({ characterId }: { characterId: number | string }) => (
    <span>{`Character ${characterId}`}</span>
  ),
  CorporationName: ({ corporationId }: { corporationId: number | string }) => (
    <span>{`Corporation ${corporationId}`}</span>
  ),
}));

const { AllianceCard } =
  require("../../Card/AllianceCard") as typeof import("../../Card/AllianceCard");
const { CharacterCard } =
  require("../../Card/CharacterCard") as typeof import("../../Card/CharacterCard");
const { EveEntityCard } =
  require("../../Card/EveEntityCard") as typeof import("../../Card/EveEntityCard");
const { EveMailSenderCard } =
  require("../../Card/EveMailSenderCard") as typeof import("../../Card/EveMailSenderCard");

const renderWithMantine = (ui: React.ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

beforeEach(() => {
  mockUseEsiAllianceInformation.mockReturnValue({ data: undefined });
  mockUseEsiAllianceMemberCorporations.mockReturnValue({ data: undefined });
  mockUseCharacter.mockReturnValue({ data: undefined });
  mockUseEsiName.mockReturnValue({ name: "Some Entity", category: undefined });
});

// ---------------------------------------------------------------------------
// AllianceCard
// ---------------------------------------------------------------------------
describe("AllianceCard", () => {
  it("renders a rich alliance card with all metadata populated", () => {
    mockUseEsiAllianceInformation.mockReturnValue({
      data: {
        data: {
          ticker: "TEST",
          creator_id: 91000001,
          creator_corporation_id: 98000001,
          executor_corporation_id: 98000002,
          date_founded: "2010-01-01T00:00:00Z",
        },
      },
    });
    mockUseEsiAllianceMemberCorporations.mockReturnValue({
      data: { data: [98000002, 98000003, 98000004] },
    });

    renderWithMantine(<AllianceCard allianceId={99000001} />);

    expect(mockUseEsiAllianceInformation).toHaveBeenCalledWith(99000001);
    expect(mockUseEsiAllianceMemberCorporations).toHaveBeenCalledWith(99000001);

    expect(screen.getByText("Alliance 99000001")).toBeInTheDocument();
    expect(screen.getByText("TEST")).toBeInTheDocument();
    expect(screen.getByText("Creator:")).toBeInTheDocument();
    expect(screen.getByText("Executor:")).toBeInTheDocument();
    expect(screen.getByText("Founded")).toBeInTheDocument();
    expect(
      screen.getByText("Date 2010-01-01T00:00:00.000Z"),
    ).toBeInTheDocument();
    // Three member corporations -> count shown plus the member list section
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Member corporation list")).toBeInTheDocument();
  });

  it("shows N/A placeholders and hides optional blocks when data is sparse", () => {
    mockUseEsiAllianceInformation.mockReturnValue({
      data: { data: {} },
    });
    mockUseEsiAllianceMemberCorporations.mockReturnValue({
      data: { data: [] },
    });

    renderWithMantine(<AllianceCard allianceId={1} />);

    // Ticker badge plus several metadata rows all fall back to "N/A"
    expect(screen.getAllByText("N/A").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("Creator:")).not.toBeInTheDocument();
    expect(screen.queryByText("Executor:")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Member corporation list"),
    ).not.toBeInTheDocument();
  });

  it("renders a header right section when provided", () => {
    mockUseEsiAllianceInformation.mockReturnValue({ data: { data: {} } });
    mockUseEsiAllianceMemberCorporations.mockReturnValue({
      data: { data: [] },
    });

    renderWithMantine(
      <AllianceCard
        allianceId={1}
        headerRightSection={<button type="button">Menu</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
  });

  it("accepts a string allianceId and coerces it for the hooks", () => {
    mockUseEsiAllianceInformation.mockReturnValue({ data: { data: {} } });
    mockUseEsiAllianceMemberCorporations.mockReturnValue({
      data: { data: [] },
    });

    renderWithMantine(<AllianceCard allianceId="42" />);
    expect(mockUseEsiAllianceInformation).toHaveBeenCalledWith(42);
  });
});

// ---------------------------------------------------------------------------
// CharacterCard
// ---------------------------------------------------------------------------
describe("CharacterCard", () => {
  it("renders the character name and avatar", () => {
    mockUseCharacter.mockReturnValue({ data: undefined });
    renderWithMantine(<CharacterCard characterId={123} />);
    expect(mockUseCharacter).toHaveBeenCalledWith(123);
    expect(screen.getByText("Character 123")).toBeInTheDocument();
    expect(screen.getByTestId("character-avatar")).toBeInTheDocument();
  });

  it("renders the corporation block once character data resolves", () => {
    mockUseCharacter.mockReturnValue({
      data: { corporationId: 98000001 },
    });
    renderWithMantine(<CharacterCard characterId={123} />);
    expect(screen.getByText("Corporation 98000001")).toBeInTheDocument();
    expect(screen.getByTestId("corporation-avatar")).toBeInTheDocument();
  });

  it("renders the alliance block when the character belongs to one", () => {
    mockUseCharacter.mockReturnValue({
      data: { corporationId: 98000001, allianceId: 99000001 },
    });
    renderWithMantine(<CharacterCard characterId={123} />);
    expect(screen.getByText("Alliance 99000001")).toBeInTheDocument();
    expect(screen.getByTestId("alliance-avatar")).toBeInTheDocument();
  });

  it("omits the alliance block when the character has no alliance", () => {
    mockUseCharacter.mockReturnValue({
      data: { corporationId: 98000001 },
    });
    renderWithMantine(<CharacterCard characterId={123} />);
    expect(screen.queryByTestId("alliance-avatar")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// EveEntityCard
// ---------------------------------------------------------------------------
describe("EveEntityCard", () => {
  it("delegates to AllianceCard for alliance entities", () => {
    mockUseEsiName.mockReturnValue({
      name: "Some Alliance",
      category: "alliance",
    });
    mockUseEsiAllianceInformation.mockReturnValue({
      data: { data: { ticker: "X" } },
    });
    mockUseEsiAllianceMemberCorporations.mockReturnValue({
      data: { data: [] },
    });

    renderWithMantine(<EveEntityCard entityId={99000001} />);
    // AllianceCard renders an AllianceName for the same id
    expect(screen.getByText("Alliance 99000001")).toBeInTheDocument();
    expect(screen.getByText("Founded")).toBeInTheDocument();
  });

  it("delegates to CharacterCard for character entities", () => {
    mockUseEsiName.mockReturnValue({
      name: "Some Pilot",
      category: "character",
    });
    mockUseCharacter.mockReturnValue({ data: undefined });

    renderWithMantine(<EveEntityCard entityId={123} />);
    expect(screen.getByText("Character 123")).toBeInTheDocument();
  });

  it("renders a generic entity paper for other categories", () => {
    mockUseEsiName.mockReturnValue({
      name: "The Forge",
      category: "region",
    });

    renderWithMantine(<EveEntityCard entityId={10000002} />);
    expect(screen.getByText("The Forge")).toBeInTheDocument();
    expect(screen.getByTestId("entity-avatar")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// EveMailSenderCard
// ---------------------------------------------------------------------------
describe("EveMailSenderCard", () => {
  it("renders 'Unknown' when no senderId is supplied", () => {
    renderWithMantine(<EveMailSenderCard />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("renders 'Unknown' (loading) when isLoading and no senderId", () => {
    renderWithMantine(<EveMailSenderCard isLoading />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("delegates to EveEntityCard when a senderId is supplied", () => {
    mockUseEsiName.mockReturnValue({ name: "Sender Name", category: "region" });
    renderWithMantine(<EveMailSenderCard senderId={123} />);
    expect(screen.getByText("Sender Name")).toBeInTheDocument();
  });
});
