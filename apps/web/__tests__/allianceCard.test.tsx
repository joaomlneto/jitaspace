import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

const mockUseEsiAllianceInformation = jest.fn();
const mockUseEsiAllianceMemberCorporations = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useEsiAllianceInformation: (allianceId: number | string) =>
    mockUseEsiAllianceInformation(allianceId),
  useEsiAllianceMemberCorporations: (allianceId: number | string) =>
    mockUseEsiAllianceMemberCorporations(allianceId),
}));

jest.mock("../../../packages/ui/Anchor", () => ({
  AllianceAnchor: ({ children }: any) => <a href="#">{children}</a>,
  CharacterAnchor: ({ children }: any) => <a href="#">{children}</a>,
  CorporationAnchor: ({ children }: any) => <a href="#">{children}</a>,
}));

jest.mock("../../../packages/ui/Avatar", () => ({
  AllianceAvatar: ({ allianceId }: { allianceId: number | string }) => (
    <span>{`Alliance Avatar ${allianceId}`}</span>
  ),
}));

jest.mock("../../../packages/ui/Text", () => ({
  AllianceName: ({ allianceId }: { allianceId: number | string }) => (
    <span>{`Alliance ${allianceId}`}</span>
  ),
  CharacterName: ({ characterId }: { characterId: number }) => (
    <span>{`Character ${characterId}`}</span>
  ),
  CorporationName: ({ corporationId }: { corporationId: number }) => (
    <span>{`Corporation ${corporationId}`}</span>
  ),
}));

jest.mock("../../../packages/ui/DateText", () => ({
  FormattedDateText: ({ date }: { date: Date }) => (
    <span>{`Date ${date.toISOString()}`}</span>
  ),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  ),
}));

describe("AllianceCard", () => {
  beforeEach(() => {
    mockUseEsiAllianceInformation.mockReset();
    mockUseEsiAllianceMemberCorporations.mockReset();
  });

  it("renders rich alliance details when available", () => {
    mockUseEsiAllianceInformation.mockReturnValue({
      data: {
        data: {
          creator_corporation_id: 917701062,
          creator_id: 540496093,
          date_founded: "2006-09-17T20:10:00Z",
          executor_corporation_id: 917701062,
          ticker: "IVY",
        },
      },
    });
    mockUseEsiAllianceMemberCorporations.mockReturnValue({
      data: {
        data: [917701062, 98000001],
      },
    });

    const { AllianceCard } = require("../../../packages/ui/Card/AllianceCard");
    render(
      <MantineProvider>
        <AllianceCard allianceId={9900} />
      </MantineProvider>,
    );

    expect(screen.getByText("Alliance 9900")).toBeInTheDocument();
    expect(screen.getByText("IVY")).toBeInTheDocument();
    expect(
      screen.getByText("Date 2006-09-17T20:10:00.000Z"),
    ).toBeInTheDocument();

    expect(screen.getByText("Member corporations")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Creator corporation")).toBeInTheDocument();
    expect(
      screen.getAllByText("Corporation 917701062").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Creator")).toBeInTheDocument();
    expect(
      screen.getAllByText("Character 540496093").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Executor corporation")).toBeInTheDocument();

    expect(screen.getByText("Member corporation list")).toBeInTheDocument();
    expect(screen.getByText("Corporation 98000001")).toBeInTheDocument();
  });

  it("hides member-corporation list and renders N/A for unknown metadata", () => {
    mockUseEsiAllianceInformation.mockReturnValue({
      data: {
        data: {},
      },
    });
    mockUseEsiAllianceMemberCorporations.mockReturnValue({
      data: {
        data: [],
      },
    });

    const { AllianceCard } = require("../../../packages/ui/Card/AllianceCard");
    render(
      <MantineProvider>
        <AllianceCard allianceId={9901} />
      </MantineProvider>,
    );

    expect(
      screen.queryByText("Member corporation list"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("N/A").length).toBeGreaterThanOrEqual(4);
  });

  it("renders a header right section when provided", () => {
    mockUseEsiAllianceInformation.mockReturnValue({
      data: {
        data: {
          ticker: "IVY",
        },
      },
    });
    mockUseEsiAllianceMemberCorporations.mockReturnValue({
      data: {
        data: [],
      },
    });

    const { AllianceCard } = require("../../../packages/ui/Card/AllianceCard");
    render(
      <MantineProvider>
        <AllianceCard
          allianceId={9902}
          headerRightSection={<button type="button">Menu</button>}
        />
      </MantineProvider>,
    );

    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
  });
});
