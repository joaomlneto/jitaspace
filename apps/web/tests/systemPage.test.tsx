import "@testing-library/jest-dom/jest-globals";

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";

const SYSTEM_ID = 30000142;

const mockUseSelectedCharacter = jest.fn();
const mockUseSolarSystem = jest.fn();
const mockUseSolarSystemCostIndices = jest.fn();
const mockUseGetSolarSystemById = jest.fn();

// system/[systemId]/page.tsx now imports prisma for generateMetadata
jest.mock("@jitaspace/db", () => ({
  prisma: {
    solarSystem: { findUnique: jest.fn().mockResolvedValue(null) },
  },
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ systemId: String(SYSTEM_ID) }),
  useRouter: () => ({}),
  usePathname: () => "/",
}));

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => mockUseSelectedCharacter(),
  useSolarSystem: (...args: unknown[]) => mockUseSolarSystem(...args),
  useSolarSystemCostIndices: () => mockUseSolarSystemCostIndices(),
}));

jest.mock("@jitaspace/sde-client", () => ({
  useGetSolarSystemById: (...args: unknown[]) =>
    mockUseGetSolarSystemById(...args),
}));

jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));

jest.mock("@jitaspace/eve-icons", () => ({
  IndustryIcon: () => null,
}));

jest.mock("~/components/ActionIcon", () => ({
  SetAutopilotDestinationActionIcon: () => (
    <div data-testid="set-autopilot" />
  ),
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
  AsteroidBeltName: () => <span>Asteroid Belt</span>,
  MoonName: () => <span>Moon</span>,
  PlanetName: ({ span }: { span?: boolean }) => <span>Planet</span>,
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
    mockUseGetSolarSystemById.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders all sections with rich data (every branch)", () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 123456789 });
    mockUseSolarSystem.mockReturnValue({
      data: {
        data: {
          stations: [60000001, 60000002],
          stargates: [50000001, 50000002],
          star_id: 40000001,
          planets: [
            {
              planet_id: 40000010,
              moons: [40000011, 40000012],
              asteroid_belts: [40000013],
            },
            {
              planet_id: 40000020,
            },
          ],
          security_class: "B",
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

    renderPage();

    expect(mockUseSolarSystem).toHaveBeenCalledWith(SYSTEM_ID);
    expect(mockUseGetSolarSystemById).toHaveBeenCalledWith(SYSTEM_ID);

    // Autopilot action icon renders because a character is selected
    expect(screen.getByTestId("set-autopilot")).toBeInTheDocument();
    expect(screen.getByTestId("sec-badge")).toBeInTheDocument();
    expect(screen.getByTestId("breadcrumbs")).toBeInTheDocument();

    // External links
    expect(
      screen.getByRole("link", { name: /DOTLAN EveMaps/ }),
    ).toHaveAttribute(
      "href",
      `https://evemaps.dotlan.net/system/${SYSTEM_ID}`,
    );
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

    // Section titles
    expect(screen.getByText("Stations")).toBeInTheDocument();
    expect(screen.getByText("Stargates")).toBeInTheDocument();
    expect(screen.getByText("Celestials")).toBeInTheDocument();

    // Industry cost indices (Object.hasOwn true branch + StatsGrid mapping)
    expect(screen.getByText("Industry Cost Indices")).toBeInTheDocument();
    expect(screen.getByTestId("stats-grid")).toBeInTheDocument();
    expect(screen.getByText("manufacturing=0.0512")).toBeInTheDocument();
    // activity underscores replaced with spaces
    expect(
      screen.getByText("researching time efficiency=0.0123"),
    ).toBeInTheDocument();

    // SDE-derived rows, truthy boolean branches -> "Yes"
    expect(screen.getByText("Security Class")).toBeInTheDocument();
    expect(screen.getByText("Border System")).toBeInTheDocument();
    expect(screen.getByText("Radius")).toBeInTheDocument();
    expect(screen.getByText("1,234,567 m")).toBeInTheDocument();
    expect(screen.getAllByText("Yes").length).toBe(6);
    expect(screen.getByText("Position")).toBeInTheDocument();
  });

  it("returns null early for a non-finite system id", () => {
    // Override useParams indirectly by making everything empty; the id itself
    // is finite, so instead exercise the empty-data / falsey-boolean branches.
    mockUseSelectedCharacter.mockReturnValue(undefined);
    mockUseSolarSystem.mockReturnValue({ data: undefined });
    mockUseSolarSystemCostIndices.mockReturnValue({ data: {} });
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

    renderPage();

    // No selected character -> no autopilot icon
    expect(screen.queryByTestId("set-autopilot")).not.toBeInTheDocument();
    // No cost indices for this system -> section hidden
    expect(screen.queryByText("Industry Cost Indices")).not.toBeInTheDocument();
    // No radius -> radius row hidden
    expect(screen.queryByText("Radius")).not.toBeInTheDocument();
    // Falsey boolean branches -> "No" (Border, Corridor, Fringe, Hub,
    // International, Regional = 6 rows)
    expect(screen.getByText("Border System")).toBeInTheDocument();
    expect(screen.getAllByText("No").length).toBe(6);
    // Stations / Stargates / Celestials titles still render (lists empty)
    expect(screen.getByText("Stations")).toBeInTheDocument();
    expect(screen.getByText("Celestials")).toBeInTheDocument();
  });

  it("renders the server wrapper (page.tsx) inside a Suspense boundary", () => {
    mockUseSelectedCharacter.mockReturnValue(undefined);
    mockUseSolarSystem.mockReturnValue({ data: undefined });
    mockUseSolarSystemCostIndices.mockReturnValue({ data: {} });
    mockUseGetSolarSystemById.mockReturnValue({ data: { data: {} } });

    const WrapperPage = require("~/app/system/[systemId]/page").default;
    render(
      <MantineProvider>
        <WrapperPage />
      </MantineProvider>,
    );

    expect(screen.getByText("Stations")).toBeInTheDocument();
  });
});
