import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

const mockUseCorporation = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useCorporation: (corporationId: number) => mockUseCorporation(corporationId),
}));

jest.mock("../../../packages/ui/Anchor", () => ({
  AllianceAnchor: ({ children }: any) => <a href="#">{children}</a>,
  CharacterAnchor: ({ children }: any) => <a href="#">{children}</a>,
  CorporationAnchor: ({ children }: any) => <a href="#">{children}</a>,
}));

jest.mock("../../../packages/ui/Avatar", () => ({
  AllianceAvatar: ({ allianceId }: { allianceId: number }) => (
    <span>{`Alliance Avatar ${allianceId}`}</span>
  ),
  CharacterAvatar: ({ characterId }: { characterId: number }) => (
    <span>{`Character Avatar ${characterId}`}</span>
  ),
  CorporationAvatar: ({
    corporationId,
  }: {
    corporationId: number | string;
  }) => <span>{`Corporation Avatar ${corporationId}`}</span>,
}));

jest.mock("../../../packages/ui/Text", () => ({
  AllianceName: ({ allianceId }: { allianceId: number }) => (
    <span>{`Alliance ${allianceId}`}</span>
  ),
  CharacterName: ({ characterId }: { characterId: number }) => (
    <span>{`Character ${characterId}`}</span>
  ),
  CorporationName: ({ corporationId }: { corporationId: number | string }) => (
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

describe("CorporationCard", () => {
  beforeEach(() => {
    mockUseCorporation.mockReset();
  });

  it("renders rich corporation details when available", () => {
    mockUseCorporation.mockReturnValue({
      data: {
        data: {
          alliance_id: 937872513,
          ceo_id: 91541581,
          creator_id: 540496093,
          date_founded: "2004-03-15T14:33:00Z",
          description:
            '<font size="16"><b>EVE University - EVE\'s premier teaching organization</b></font>',
          member_count: 5716,
          shares: 1000,
          tax_rate: 0,
          ticker: "E-UNI",
          url: "https://www.eveuniversity.org",
          war_eligible: false,
        },
      },
    });

    const {
      CorporationCard,
    } = require("../../../packages/ui/Card/CorporationCard");
    render(
      <MantineProvider>
        <CorporationCard corporationId={98553333} />
      </MantineProvider>,
    );

    expect(screen.getByText("Corporation 98553333")).toBeInTheDocument();
    expect(screen.getByText("E-UNI")).toBeInTheDocument();
    expect(screen.getByText("Alliance 937872513")).toBeInTheDocument();
    expect(screen.getByText("CEO:")).toBeInTheDocument();
    expect(screen.getByText("Character 91541581")).toBeInTheDocument();
    expect(screen.getByText("Founder:")).toBeInTheDocument();
    expect(screen.getByText("Character 540496093")).toBeInTheDocument();

    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getByText("5,716")).toBeInTheDocument();
    expect(screen.getByText("Tax rate")).toBeInTheDocument();
    expect(screen.getByText("0.0%")).toBeInTheDocument();
    expect(screen.getByText("Shares")).toBeInTheDocument();
    expect(screen.getByText("1,000")).toBeInTheDocument();
    expect(screen.getByText("War eligible")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();

    expect(
      screen.getByText("Date 2004-03-15T14:33:00.000Z"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("EVE University - EVE's premier teaching organization"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/<font/i)).not.toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "https://www.eveuniversity.org" }),
    ).toHaveAttribute("href", "https://www.eveuniversity.org");
  });

  it("hides optional relationship/description blocks and shows N/A for unknown metadata", () => {
    mockUseCorporation.mockReturnValue({
      data: {
        data: {
          ticker: "N/A",
        },
      },
    });

    const {
      CorporationCard,
    } = require("../../../packages/ui/Card/CorporationCard");
    render(
      <MantineProvider>
        <CorporationCard corporationId={42} />
      </MantineProvider>,
    );

    expect(screen.queryByText("CEO:")).not.toBeInTheDocument();
    expect(screen.queryByText("Founder:")).not.toBeInTheDocument();
    expect(screen.queryByText(/Alliance /)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "https://www.eveuniversity.org" }),
    ).not.toBeInTheDocument();

    expect(screen.getByText("Tax rate")).toBeInTheDocument();
    expect(screen.getAllByText("N/A").length).toBeGreaterThanOrEqual(4);
  });

  it("renders a header right section when provided", () => {
    mockUseCorporation.mockReturnValue({
      data: {
        data: {
          ticker: "TEST",
        },
      },
    });

    const {
      CorporationCard,
    } = require("../../../packages/ui/Card/CorporationCard");
    render(
      <MantineProvider>
        <CorporationCard
          corporationId={42}
          headerRightSection={<button type="button">Menu</button>}
        />
      </MantineProvider>,
    );

    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
  });
});
