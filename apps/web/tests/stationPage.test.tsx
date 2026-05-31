import "@testing-library/jest-dom/jest-globals";

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

let stationId = "60003760";

const mockUseStation = jest.fn();
const mockUseSelectedCharacter = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({ stationId }),
  useRouter: () => ({}),
  usePathname: () => "/",
}));

jest.mock("@jitaspace/hooks", () => ({
  useStation: (id: number) => mockUseStation(id),
  useSelectedCharacter: () => mockUseSelectedCharacter(),
}));

jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));

jest.mock("~/components/ActionIcon", () => ({
  SetAutopilotDestinationActionIcon: () => null,
}));

jest.mock("~/components/Avatar", () => ({
  StationAvatar: () => <div>Station Avatar</div>,
}));

jest.mock("~/components/Badge", () => ({
  SolarSystemSecurityStatusBadge: () => <div>Security Badge</div>,
}));

jest.mock("~/components/Text", () => ({
  RaceName: () => <span>Race Name</span>,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href?: string | object; children?: ReactNode }) => (
    <a href={typeof href === "string" ? href : ""}>{children}</a>
  ),
}));

function renderPage() {
  const Page = require("~/app/station/[stationId]/page.client").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
  );
}

describe("station page", () => {
  afterEach(() => {
    jest.clearAllMocks();
    stationId = "60003760";
  });

  it("renders all sections with rich station data and a selected character", () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 12345 });
    mockUseStation.mockReturnValue({
      data: {
        data: {
          system_id: 30000142,
          type_id: 1529,
          race_id: 1,
          owner: 1000035,
        },
      },
    });

    renderPage();

    expect(screen.getByText("Solar System")).toBeInTheDocument();
    expect(screen.getByText("Station Type")).toBeInTheDocument();
    expect(screen.getByText("Race")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "DOTLAN EveMaps" }),
    ).toHaveAttribute("href", "https://evemaps.dotlan.net/station/60003760");
  });

  it("renders with undefined station data and no selected character", () => {
    mockUseSelectedCharacter.mockReturnValue(null);
    mockUseStation.mockReturnValue({ data: undefined });

    renderPage();

    expect(screen.getByText("Solar System")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("returns null when the station id is not finite", () => {
    stationId = "abc";
    mockUseSelectedCharacter.mockReturnValue(null);
    mockUseStation.mockReturnValue({ data: undefined });

    renderPage();
    // page returns null -> none of its content is rendered
    expect(screen.queryByText("Solar System")).not.toBeInTheDocument();
    expect(screen.queryByText("Station Type")).not.toBeInTheDocument();
  });
});
