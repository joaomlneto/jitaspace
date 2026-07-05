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

const mockUseParams = jest.fn<() => Record<string, string>>();
const mockUseSelectedCharacter = jest.fn();
const mockUseSolarSystem = jest.fn();
const mockUseSolarSystemCostIndices = jest.fn();
const mockUseSolarSystemSovereignty = jest.fn();
const mockUseAllSolarSystemJumps = jest.fn();
const mockUseAllSolarSystemKills = jest.fn();
const mockUseStar = jest.fn();
const mockUseStargate = jest.fn();
const mockUseGetSolarSystemById = jest.fn();
const mockUseGetFwSystems = jest.fn();
const mockUseGetIncursions = jest.fn();

// system/[systemId]/page.tsx imports prisma for generateMetadata
jest.mock("~/lib/db", () => ({
  prisma: {
    solarSystem: { findUnique: jest.fn().mockResolvedValue(null) },
  },
}));

jest.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
  useRouter: () => ({}),
  usePathname: () => "/",
}));

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => mockUseSelectedCharacter(),
  useSolarSystem: (...args: unknown[]) => mockUseSolarSystem(...args),
  useSolarSystemCostIndices: () => mockUseSolarSystemCostIndices(),
  useSolarSystemSovereignty: (...args: unknown[]) =>
    mockUseSolarSystemSovereignty(...args),
  useAllSolarSystemJumps: () => mockUseAllSolarSystemJumps(),
  useAllSolarSystemKills: () => mockUseAllSolarSystemKills(),
  useStar: (...args: unknown[]) => mockUseStar(...args),
  useStargate: (...args: unknown[]) => mockUseStargate(...args),
}));

jest.mock("@jitaspace/esi-client", () => ({
  useGetFwSystems: () => mockUseGetFwSystems(),
  useGetIncursions: () => mockUseGetIncursions(),
}));

jest.mock("@jitaspace/sde-client", () => ({
  useGetSolarSystemById: (...args: unknown[]) =>
    mockUseGetSolarSystemById(...args),
}));

// Only the handful of @jitaspace/ui exports the page actually uses. The pure
// helpers return deterministic values so branch behaviour is predictable.
jest.mock("@jitaspace/ui", () => ({
  FactionAvatar: () => null,
  Position3DText: () => <span data-testid="position" />,
  formatSecurityStatus: (s: number) => Number(s).toFixed(1),
  isLightSecurityStatus: () => false,
  securityStatusBand: () => "High-Sec",
  securityStatusColor: () => "#4072D9",
}));

jest.mock("~/components/ActionIcon", () => ({
  SetAutopilotDestinationActionIcon: () => <div data-testid="set-autopilot" />,
}));

jest.mock("~/components/Avatar", () => ({
  PlanetAvatar: () => null,
  SolarSystemStarAvatar: () => null,
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

jest.mock("~/components/Home", () => ({
  SectionHeader: ({ title }: { title: string }) => <h3>{title}</h3>,
}));

jest.mock("~/components/Text", () => ({
  PlanetName: () => <span>Planet</span>,
  StarName: () => <span>Star</span>,
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
    mockUseParams.mockReset().mockReturnValue({ systemId: String(SYSTEM_ID) });
    mockUseSelectedCharacter.mockReset().mockReturnValue(undefined);
    mockUseSolarSystem.mockReset().mockReturnValue({ data: undefined });
    mockUseSolarSystemCostIndices.mockReset().mockReturnValue({ data: {} });
    mockUseSolarSystemSovereignty.mockReset().mockReturnValue(undefined);
    mockUseAllSolarSystemJumps.mockReset().mockReturnValue({ data: { data: [] } });
    mockUseAllSolarSystemKills.mockReset().mockReturnValue({ data: { data: [] } });
    mockUseStar.mockReset().mockReturnValue({ data: undefined });
    mockUseStargate.mockReset().mockReturnValue({ data: undefined });
    mockUseGetSolarSystemById.mockReset().mockReturnValue({ data: undefined });
    mockUseGetFwSystems.mockReset().mockReturnValue({ data: { data: [] } });
    mockUseGetIncursions.mockReset().mockReturnValue({ data: { data: [] } });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders every section for a rich system (sovereignty, FW, incursion)", () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 123456789 });
    mockUseSolarSystem.mockReturnValue({
      data: {
        data: {
          constellation_id: 20000020,
          security_status: 0.9459,
          security_class: "B",
          star_id: 40000001,
          planets: [
            { planet_id: 40000010, moons: [1, 2], asteroid_belts: [3] },
            { planet_id: 40000020, moons: [], asteroid_belts: [] },
          ],
          stargates: [50000001, 50000002],
          stations: [60000001, 60000002],
        },
      },
    });
    mockUseGetSolarSystemById.mockReturnValue({
      data: {
        data: {
          luminosity: 1.692,
          radius: 1234567,
          position: { x: 1, y: 2, z: 3 },
          hub: true,
          border: true,
          fringe: false,
          corridor: false,
          international: true,
          regional: false,
          factionID: 500001,
          wormholeClassID: null,
        },
      },
    });
    mockUseStar.mockReturnValue({
      data: { data: { spectral_class: "F1 V", temperature: 7305 } },
    });
    mockUseStargate.mockReturnValue({
      data: { data: { destination: { system_id: 30000144 } } },
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
    mockUseAllSolarSystemJumps.mockReturnValue({
      data: { data: [{ system_id: SYSTEM_ID, ship_jumps: 2105 }] },
    });
    mockUseAllSolarSystemKills.mockReturnValue({
      data: {
        data: [
          { system_id: SYSTEM_ID, ship_kills: 65, pod_kills: 62, npc_kills: 43 },
        ],
      },
    });
    mockUseSolarSystemSovereignty.mockReturnValue({ faction_id: 500001 });
    mockUseGetFwSystems.mockReturnValue({
      data: {
        data: [
          {
            solar_system_id: SYSTEM_ID,
            contested: "contested",
            owner_faction_id: 500001,
            occupier_faction_id: 500002,
            victory_points: 1000,
            victory_points_threshold: 3000,
          },
        ],
      },
    });
    mockUseGetIncursions.mockReturnValue({
      data: {
        data: [
          {
            constellation_id: 20000020,
            faction_id: 500019,
            has_boss: true,
            infested_solar_systems: [SYSTEM_ID],
            influence: 0.5,
            staging_solar_system_id: SYSTEM_ID,
            state: "established",
            type: "Incursion",
          },
        ],
      },
    });

    renderPage();

    expect(mockUseSolarSystem).toHaveBeenCalledWith(SYSTEM_ID);
    expect(mockUseGetSolarSystemById).toHaveBeenCalledWith(SYSTEM_ID);

    // Header widgets
    expect(screen.getByTestId("set-autopilot")).toBeInTheDocument();
    expect(screen.getByTestId("breadcrumbs")).toBeInTheDocument();
    expect(screen.getAllByTestId("sec-badge").length).toBeGreaterThan(0);

    // External links
    expect(screen.getByRole("link", { name: /DOTLAN/ })).toHaveAttribute(
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

    // Section headers
    expect(screen.getByText("Activity · Last Hour")).toBeInTheDocument();
    expect(screen.getByText("Celestials")).toBeInTheDocument();
    expect(screen.getByText("Stargates")).toBeInTheDocument();
    expect(screen.getByText("Stations")).toBeInTheDocument();
    expect(screen.getByText("Industry Indices")).toBeInTheDocument();
    expect(screen.getByText("System Information")).toBeInTheDocument();

    // Live activity value
    expect(screen.getByText("2,105")).toBeInTheDocument();

    // Control panels
    expect(screen.getByText("Sovereignty")).toBeInTheDocument();
    expect(screen.getByText("Faction Warfare")).toBeInTheDocument();
    expect(screen.getByText("Incursion")).toBeInTheDocument();
    expect(screen.getByText(/1,000 \/ 3,000 victory points/)).toBeInTheDocument();
    expect(screen.getByText(/50% influence/)).toBeInTheDocument();

    // Industry indices (cost_index rendered as a percentage, underscores spaced)
    expect(screen.getByText("manufacturing")).toBeInTheDocument();
    expect(screen.getByText("5.12%")).toBeInTheDocument();
    expect(screen.getByText("researching time efficiency")).toBeInTheDocument();

    // System information + SDE-derived data
    expect(screen.getByText("Security Status")).toBeInTheDocument();
    expect(screen.getByText("0.95")).toBeInTheDocument();
    expect(screen.getByText("1,234,567 m")).toBeInTheDocument();
    expect(screen.getByText("Trade Hub")).toBeInTheDocument();
    expect(screen.getByText("Border")).toBeInTheDocument();
    expect(screen.getByText("Regional")).toBeInTheDocument();
    expect(screen.getByTestId("position")).toBeInTheDocument();
  });

  it("handles an empty / still-loading system", () => {
    // No selected character, no system data, no live data, no cost indices.
    mockUseAllSolarSystemJumps.mockReturnValue({ data: undefined });
    mockUseAllSolarSystemKills.mockReturnValue({ data: undefined });

    renderPage();

    // No character -> no autopilot icon
    expect(screen.queryByTestId("set-autopilot")).not.toBeInTheDocument();
    // No sovereignty / FW / incursion -> those panels are hidden
    expect(screen.queryByText("Sovereignty")).not.toBeInTheDocument();
    expect(screen.queryByText("Faction Warfare")).not.toBeInTheDocument();
    expect(screen.queryByText("Incursion")).not.toBeInTheDocument();
    // No cost indices for this system -> section hidden
    expect(screen.queryByText("Industry Indices")).not.toBeInTheDocument();
    // No SDE data -> no trait chips
    expect(screen.queryByText("Trade Hub")).not.toBeInTheDocument();
    // Headers and empty-state copy still render
    expect(screen.getByText("Celestials")).toBeInTheDocument();
    expect(screen.getByText("Activity · Last Hour")).toBeInTheDocument();
    expect(screen.getByText("No NPC stations in this system.")).toBeInTheDocument();
    expect(screen.getByText(/No stargates/)).toBeInTheDocument();
  });

  it("labels a wormhole system as W-Space and shows its class", () => {
    mockUseSolarSystem.mockReturnValue({
      data: {
        data: {
          security_status: -1.0,
          star_id: 40000001,
          planets: [],
          stargates: [],
          stations: [],
        },
      },
    });
    mockUseGetSolarSystemById.mockReturnValue({
      data: {
        data: {
          position: { x: 1, y: 2, z: 3 },
          hub: false,
          border: false,
          fringe: false,
          corridor: false,
          international: false,
          regional: false,
          wormholeClassID: 3,
        },
      },
    });

    renderPage();

    expect(screen.getByText("W-Space")).toBeInTheDocument();
    expect(screen.getByText("Wormhole Class")).toBeInTheDocument();
    expect(screen.getByText(/only reachable by wormhole/)).toBeInTheDocument();
  });

  it("returns null for a non-finite system id", () => {
    mockUseParams.mockReturnValue({ systemId: "not-a-number" });

    renderPage();

    expect(screen.queryByText("System Information")).not.toBeInTheDocument();
    expect(screen.queryByText("Celestials")).not.toBeInTheDocument();
  });

  it("renders the server wrapper (page.tsx) inside a Suspense boundary", () => {
    const WrapperPage = require("~/app/system/[systemId]/page").default;
    render(
      <MantineProvider>
        <WrapperPage />
      </MantineProvider>,
    );

    expect(screen.getByText("Stations")).toBeInTheDocument();
  });
});
