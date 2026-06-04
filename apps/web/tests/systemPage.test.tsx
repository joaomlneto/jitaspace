import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";

const SYSTEM_ID = 30000142;

const mockUseSelectedCharacter = jest.fn();
const mockUseSolarSystem = jest.fn();
const mockUseSolarSystemCostIndices = jest.fn();
const mockUseSolarSystemSovereignty = jest.fn();
const mockUseGetSolarSystemById = jest.fn();
const mockUseGetConstellationById = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({ systemId: String(SYSTEM_ID) }),
  useRouter: () => ({}),
  usePathname: () => "/",
}));

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => mockUseSelectedCharacter(),
  useSolarSystem: (...args: unknown[]) => mockUseSolarSystem(...args),
  useSolarSystemCostIndices: () => mockUseSolarSystemCostIndices(),
  useSolarSystemSovereignty: (...args: unknown[]) =>
    mockUseSolarSystemSovereignty(...args),
}));

jest.mock("@jitaspace/sde-client", () => ({
  useGetSolarSystemById: (...args: unknown[]) =>
    mockUseGetSolarSystemById(...args),
  useGetConstellationById: (...args: unknown[]) =>
    mockUseGetConstellationById(...args),
}));

jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));

jest.mock("@jitaspace/eve-icons", () => ({
  IndustryIcon: () => null,
}));

jest.mock("~/components/ActionIcon", () => ({
  SetAutopilotDestinationActionIcon: () => <div data-testid="set-autopilot" />,
}));

jest.mock("~/components/Anchor", () => ({
  StargateDestinationAnchor: ({ children }: { children?: ReactNode }) => (
    <span>{children}</span>
  ),
}));

jest.mock("~/components/Avatar", () => ({
  PlanetAvatar: () => null,
  StarAvatar: () => null,
  StargateAvatar: () => null,
  StationAvatar: () => null,
}));

jest.mock("~/components/Badge", () => ({
  SolarSystemSecurityStatusBadge: () => <span data-testid="sec-badge" />,
}));

jest.mock("~/components/Breadcrumbs", () => ({
  SolarSystemBreadcrumbs: () => <nav data-testid="breadcrumbs" />,
}));

jest.mock("~/components/Text", () => ({
  PlanetName: () => <span>Planet</span>,
  StargateName: () => <span>Stargate</span>,
  StarName: () => <span>Star</span>,
}));

jest.mock("~/components/UI", () => ({
  StatsGrid: ({ data }: { data: { title: string; value: string }[] }) => (
    <div data-testid="stats-grid">
      {data.map((d) => (
        <div key={d.title}>{`${d.title}=${d.value}`}</div>
      ))}
    </div>
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
  const Page = require("~/app/system/[systemId]/page.client").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
  );
}

describe("System page", () => {
  beforeEach(() => {
    mockUseSelectedCharacter.mockReset();
    mockUseSolarSystem.mockReset();
    mockUseSolarSystemCostIndices.mockReset();
    mockUseSolarSystemSovereignty.mockReset();
    mockUseGetSolarSystemById.mockReset();
    mockUseGetConstellationById.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders every section with rich data (alliance sovereignty, wormhole)", () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 123456789 });
    mockUseSolarSystem.mockReturnValue({
      data: {
        data: {
          security_status: 0.9459,
          security_class: "B",
          constellation_id: 20000001,
          star_id: 40000001,
          stations: [60000001, 60000002],
          stargates: [50000001, 50000002],
          planets: [
            {
              planet_id: 40000010,
              moons: [40000011, 40000012],
              asteroid_belts: [40000013],
            },
            { planet_id: 40000020 },
          ],
        },
      },
    });
    mockUseSolarSystemCostIndices.mockReturnValue({
      data: {
        [SYSTEM_ID]: {
          cost_indices: [
            { activity: "manufacturing", cost_index: 0.0512 },
            { activity: "researching_time_efficiency", cost_index: 0.0123 },
          ],
        },
      },
    });
    mockUseSolarSystemSovereignty.mockReturnValue({ alliance_id: 99000001 });
    mockUseGetSolarSystemById.mockReturnValue({
      data: {
        data: {
          luminosity: 0.045,
          radius: 1234567,
          border: true,
          corridor: true,
          fringe: true,
          hub: true,
          international: true,
          regional: true,
          position: { x: 1, y: 2, z: 3 },
        },
      },
    });
    // Wormhole class resolved from the constellation (C5)
    mockUseGetConstellationById.mockReturnValue({
      data: { data: { wormholeClassID: 5 } },
    });

    renderPage();

    expect(mockUseSolarSystem).toHaveBeenCalledWith(SYSTEM_ID);
    expect(mockUseGetSolarSystemById).toHaveBeenCalledWith(SYSTEM_ID);
    expect(mockUseGetConstellationById).toHaveBeenCalledWith(20000001);

    // Header: autopilot icon (character selected), badge, breadcrumbs, sovereignty
    expect(screen.getByTestId("set-autopilot")).toBeInTheDocument();
    expect(screen.getByTestId("sec-badge")).toBeInTheDocument();
    expect(screen.getByTestId("breadcrumbs")).toBeInTheDocument();
    expect(screen.getByText("Sovereignty")).toBeInTheDocument();
    expect(screen.getByText("Wormhole · C5")).toBeInTheDocument();

    // External links
    expect(
      screen.getByRole("link", { name: /DOTLAN EveMaps/ }),
    ).toHaveAttribute("href", `https://evemaps.dotlan.net/system/${SYSTEM_ID}`);
    expect(screen.getByRole("link", { name: /zKillboard/ })).toHaveAttribute(
      "href",
      `https://zkillboard.com/system/${SYSTEM_ID}`,
    );
    expect(screen.getByRole("link", { name: /Eveeye/ })).toHaveAttribute(
      "href",
      `https://eveeye.com/?s=${SYSTEM_ID}`,
    );
    expect(screen.getByRole("link", { name: /Adam4EVE/ })).toHaveAttribute(
      "href",
      `https://www.adam4eve.eu/location.php?id=${SYSTEM_ID}`,
    );

    // Summary stat labels (unique to the grid)
    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(screen.getByText("Planets")).toBeInTheDocument();
    expect(screen.getByText("Moons")).toBeInTheDocument();
    expect(screen.getByText("Belts")).toBeInTheDocument();

    // Section titles render (each appears as a summary stat AND a section title)
    expect(screen.getByText("Celestials")).toBeInTheDocument();
    expect(screen.getAllByText("Stations")).toHaveLength(2);
    expect(screen.getAllByText("Stargates")).toHaveLength(2);
    expect(screen.getAllByText("Planet")).toHaveLength(2);

    // Industry cost indices rendered as percentages
    expect(screen.getByText("Industry Cost Indices")).toBeInTheDocument();
    expect(screen.getByTestId("stats-grid")).toBeInTheDocument();
    expect(screen.getByText("manufacturing=5.12%")).toBeInTheDocument();
    expect(
      screen.getByText("researching time efficiency=1.23%"),
    ).toBeInTheDocument();

    // System details
    expect(screen.getByText("Security Status")).toBeInTheDocument();
    expect(screen.getByText("Security Class")).toBeInTheDocument();
    expect(screen.getByText("Luminosity")).toBeInTheDocument();
    expect(screen.getByText("Radius")).toBeInTheDocument();
    expect(screen.getByText("1,234,567 m")).toBeInTheDocument();
    expect(screen.getByText("Position")).toBeInTheDocument();

    // Classifications badges (all six active)
    expect(screen.getByText("Classifications")).toBeInTheDocument();
    expect(screen.getByText("Trade Hub")).toBeInTheDocument();
    expect(screen.getByText("Border")).toBeInTheDocument();
    expect(screen.getByText("Fringe")).toBeInTheDocument();
    expect(screen.getByText("Corridor")).toBeInTheDocument();
    expect(screen.getByText("International")).toBeInTheDocument();
    expect(screen.getByText("Regional")).toBeInTheDocument();
  });

  it("hides empty sections and optional rows when data is sparse", () => {
    mockUseSelectedCharacter.mockReturnValue(undefined);
    mockUseSolarSystem.mockReturnValue({ data: undefined });
    mockUseSolarSystemCostIndices.mockReturnValue({ data: {} });
    mockUseSolarSystemSovereignty.mockReturnValue(undefined);
    mockUseGetSolarSystemById.mockReturnValue({
      data: {
        data: {
          luminosity: undefined,
          border: false,
          corridor: false,
          fringe: false,
          hub: false,
          international: false,
          regional: false,
        },
      },
    });
    mockUseGetConstellationById.mockReturnValue({ data: undefined });

    renderPage();

    // No selected character -> no autopilot icon
    expect(screen.queryByTestId("set-autopilot")).not.toBeInTheDocument();
    // No player/faction sovereignty -> no sovereignty line
    expect(screen.queryByText("Sovereignty")).not.toBeInTheDocument();
    expect(screen.queryByText("Faction")).not.toBeInTheDocument();
    // No wormhole class -> no wormhole badge
    expect(screen.queryByText(/Wormhole/)).not.toBeInTheDocument();
    // No cost indices for this system -> section hidden
    expect(screen.queryByText("Industry Cost Indices")).not.toBeInTheDocument();
    // No radius / luminosity -> rows hidden
    expect(screen.queryByText("Radius")).not.toBeInTheDocument();
    expect(screen.queryByText("Luminosity")).not.toBeInTheDocument();
    // Empty celestials (no star, no planets) -> section hidden
    expect(screen.queryByText("Celestials")).not.toBeInTheDocument();
    // All classification flags falsey -> no classifications row
    expect(screen.queryByText("Classifications")).not.toBeInTheDocument();
    // Summary stat labels still render even while loading
    expect(screen.getByText("Planets")).toBeInTheDocument();
    // Position row always renders
    expect(screen.getByText("Position")).toBeInTheDocument();
  });

  it("renders corporation sovereignty when no alliance holds the system", () => {
    mockUseSelectedCharacter.mockReturnValue(undefined);
    mockUseSolarSystem.mockReturnValue({
      data: { data: { security_status: -0.4 } },
    });
    mockUseSolarSystemCostIndices.mockReturnValue({ data: {} });
    mockUseSolarSystemSovereignty.mockReturnValue({ corporation_id: 98000001 });
    mockUseGetSolarSystemById.mockReturnValue({ data: { data: {} } });
    mockUseGetConstellationById.mockReturnValue({ data: undefined });

    renderPage();

    expect(screen.getByText("Sovereignty")).toBeInTheDocument();
  });

  it("renders faction control for faction-warfare systems", () => {
    mockUseSelectedCharacter.mockReturnValue(undefined);
    mockUseSolarSystem.mockReturnValue({
      data: { data: { security_status: -0.4 } },
    });
    mockUseSolarSystemCostIndices.mockReturnValue({ data: {} });
    mockUseSolarSystemSovereignty.mockReturnValue({ faction_id: 500001 });
    mockUseGetSolarSystemById.mockReturnValue({ data: { data: {} } });
    mockUseGetConstellationById.mockReturnValue({ data: undefined });

    renderPage();

    expect(screen.getByText("Faction")).toBeInTheDocument();
  });

  it("renders the server wrapper (page.tsx) inside a Suspense boundary", () => {
    mockUseSelectedCharacter.mockReturnValue(undefined);
    mockUseSolarSystem.mockReturnValue({ data: undefined });
    mockUseSolarSystemCostIndices.mockReturnValue({ data: {} });
    mockUseSolarSystemSovereignty.mockReturnValue(undefined);
    mockUseGetSolarSystemById.mockReturnValue({ data: { data: {} } });
    mockUseGetConstellationById.mockReturnValue({ data: undefined });

    const WrapperPage = require("~/app/system/[systemId]/page").default;
    render(
      <MantineProvider>
        <WrapperPage />
      </MantineProvider>,
    );

    // The summary stat labels render even before data resolves
    expect(screen.getByText("Planets")).toBeInTheDocument();
  });
});
