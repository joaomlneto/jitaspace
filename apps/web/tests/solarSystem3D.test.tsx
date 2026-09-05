import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import type { SolarSystemMapProps } from "@jitaspace/solar-system-map";

const mockUseSolarSystem = jest.fn();

// The module-scope `loading` fallback next/dynamic is configured with, captured
// so the height it renders at can be asserted on.
let mockDynamicLoading: (() => ReactNode) | undefined;

// Every query-options object the adapter hands to react-query, so the shared
// `staleTime` wiring can be asserted on.
const mockSeenQueries: {
  _kind: string;
  _id: number;
  staleTime?: number;
  retry?: number;
}[] = [];

// Query ids the stub should report as still in-flight, so a test can drive the
// `settled` gate's isLoading path (a body query pending after the system query
// has already resolved), not just the unresolved-system path.
const mockLoadingIds = new Set<number>();

// The map pulls in three.js/WebGL; the adapter loads it via next/dynamic and
// also prefetches it on mount. Stub both so no GPU/ESM code runs under jsdom,
// and surface the props the adapter computed as data-attributes to assert on.
const HOVER_KINDS = ["star", "planet", "moon", "station", "stargate"] as const;

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: (_loader: unknown, options?: { loading?: () => ReactNode }) => {
    mockDynamicLoading = options?.loading;
    return (props: SolarSystemMapProps) => (
      <div
        data-testid="ssm"
        data-star-id={String(props.star.id)}
        data-star-radius={String(props.star.radius)}
        data-planets={String(props.planets.length)}
        data-planet0-moons={String(props.planets[0]?.moons.length ?? -1)}
        data-stations={String(props.stations.length)}
        data-stargates={String(props.stargates.length)}
        data-height={String(props.height)}
        // carrying the ESI x/y/z through to each body's `position` is the whole
        // job of this adapter, so surface them rather than only the counts
        data-planet0-pos={JSON.stringify(props.planets[0]?.position)}
        data-moon0-pos={JSON.stringify(props.planets[0]?.moons[0]?.position)}
        data-station0-pos={JSON.stringify(props.stations[0]?.position)}
        data-stargate0-pos={JSON.stringify(props.stargates[0]?.position)}
      >
        {HOVER_KINDS.map((kind) => (
          <span key={kind} data-testid={`label-${kind}`}>
            {/* the star's real id matters — an absent star is passed a sentinel */}
            {props.renderLabel?.({
              kind,
              id: kind === "star" ? props.star.id : 1,
            })}
          </span>
        ))}
      </div>
    );
  },
}));

jest.mock("@jitaspace/solar-system-map", () => ({
  __esModule: true,
  SolarSystemMap: () => null,
}));

jest.mock("@jitaspace/hooks", () => ({
  useSolarSystem: (id: number) => mockUseSolarSystem(id),
}));

// Tag each query-options call so the react-query stub can dispatch to fixtures.
jest.mock("@jitaspace/esi-client", () => ({
  getUniverseStarsStarIdQueryOptions: (id: number) => ({
    _kind: "star",
    _id: id,
  }),
  getUniversePlanetsPlanetIdQueryOptions: (id: number) => ({
    _kind: "planet",
    _id: id,
  }),
  getUniverseMoonsMoonIdQueryOptions: (id: number) => ({
    _kind: "moon",
    _id: id,
  }),
  getUniverseStationsStationIdQueryOptions: (id: number) => ({
    _kind: "station",
    _id: id,
  }),
  getUniverseStargatesStargateIdQueryOptions: (id: number) => ({
    _kind: "stargate",
    _id: id,
  }),
}));

jest.mock("@tanstack/react-query", () => {
  // ESI universe bodies keyed by kind+id. A body without a `position` models a
  // record that hasn't resolved (or lacks coordinates) and must be dropped. Only
  // the star carries a radius — ESI's planet/moon endpoints don't expose one.
  const BODIES: Record<string, Record<number, unknown>> = {
    star: { 40000001: { radius: 5e8 } },
    planet: {
      40000010: { position: { x: 4e10, y: 0, z: 2e10 } },
      40000020: {}, // no position → dropped
    },
    moon: {
      40000101: { position: { x: 4e10, y: 0, z: 2e10 } },
      40000102: {}, // no position → dropped
    },
    station: {
      60000001: { position: { x: 41e9, y: 1e9, z: 20e9 } },
      60000002: {}, // no position → dropped
    },
    stargate: { 50000001: { position: { x: 0, y: 0, z: -4e12 } } },
  };
  // React Query exposes `data: undefined` for a disabled/unresolved query, and
  // `data: { data: body }` (the axios envelope) once it resolves.
  const result = (q: {
    _kind: string;
    _id: number;
    staleTime?: number;
    retry?: number;
  }) => {
    mockSeenQueries.push(q);
    const body = BODIES[q._kind]?.[q._id];
    return {
      data: body === undefined ? undefined : { data: body },
      isLoading: mockLoadingIds.has(q._id),
    };
  };
  return {
    useQuery: (opts: { _kind: string; _id: number }) => result(opts),
    useQueries: ({
      queries,
      combine,
    }: {
      queries: { _kind: string; _id: number }[];
      combine?: (results: ReturnType<typeof result>[]) => unknown;
    }) => {
      const results = queries.map(result);
      return combine ? combine(results) : results;
    },
  };
});

jest.mock("@jitaspace/eve-components", () => ({
  StationName: () => <>station-name</>,
}));

jest.mock("~/components/Text", () => ({
  MoonName: () => <>moon-name</>,
  PlanetName: () => <>planet-name</>,
  StargateName: () => <>stargate-name</>,
  StarName: () => <>star-name</>,
}));

const { SolarSystem3D } =
  require("~/components/SolarSystem3D/SolarSystem3D") as typeof import("~/components/SolarSystem3D/SolarSystem3D");

const SYSTEM = {
  star_id: 40000001,
  planets: [
    { planet_id: 40000010, moons: [40000101, 40000102] },
    { planet_id: 40000020, moons: [] },
  ],
  stations: [60000001, 60000002],
  stargates: [50000001],
};

function renderAdapter(height?: number | string) {
  return render(
    <MantineProvider>
      <SolarSystem3D solarSystemId={30000001} height={height} />
    </MantineProvider>,
  );
}

describe("SolarSystem3D adapter", () => {
  beforeEach(() => {
    mockUseSolarSystem.mockReset();
    mockSeenQueries.length = 0;
    mockLoadingIds.clear();
  });

  it("maps resolved ESI bodies into map props, dropping position-less ones", () => {
    mockUseSolarSystem.mockReturnValue({
      data: { data: SYSTEM },
      isError: false,
    });

    renderAdapter();

    const map = screen.getByTestId("ssm");
    expect(map).toHaveAttribute("data-star-id", "40000001");
    expect(map).toHaveAttribute("data-star-radius", "500000000");
    // planet 40000020 has no SDE position → dropped
    expect(map).toHaveAttribute("data-planets", "1");
    // moon 40000102 has no position → dropped from its planet
    expect(map).toHaveAttribute("data-planet0-moons", "1");
    // station 60000002 has no position → dropped
    expect(map).toHaveAttribute("data-stations", "1");
    expect(map).toHaveAttribute("data-stargates", "1");
  });

  it("carries each body's ESI coordinates through to its map position", () => {
    mockUseSolarSystem.mockReturnValue({
      data: { data: SYSTEM },
      isError: false,
    });

    renderAdapter();

    // x/y/z in that order, straight from the ESI fixtures above — a mirrored
    // axis or a misaligned index would still type-check and still be a Vec3
    const map = screen.getByTestId("ssm");
    expect(map).toHaveAttribute(
      "data-planet0-pos",
      "[40000000000,0,20000000000]",
    );
    expect(map).toHaveAttribute(
      "data-moon0-pos",
      "[40000000000,0,20000000000]",
    );
    expect(map).toHaveAttribute(
      "data-station0-pos",
      "[41000000000,1000000000,20000000000]",
    );
    expect(map).toHaveAttribute("data-stargate0-pos", "[0,0,-4000000000000]");
  });

  it("routes each hover kind to its matching name component", () => {
    mockUseSolarSystem.mockReturnValue({
      data: { data: SYSTEM },
      isError: false,
    });

    renderAdapter();

    expect(screen.getByTestId("label-star")).toHaveTextContent("star-name");
    expect(screen.getByTestId("label-planet")).toHaveTextContent("planet-name");
    expect(screen.getByTestId("label-moon")).toHaveTextContent("moon-name");
    expect(screen.getByTestId("label-station")).toHaveTextContent(
      "station-name",
    );
    expect(screen.getByTestId("label-stargate")).toHaveTextContent(
      "stargate-name",
    );
  });

  it("shows an error message when the system query fails", () => {
    mockUseSolarSystem.mockReturnValue({ data: undefined, isError: true });

    renderAdapter();

    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
    expect(screen.queryByTestId("ssm")).not.toBeInTheDocument();
  });

  it("stays in the loading state until the system resolves", () => {
    mockUseSolarSystem.mockReturnValue({ data: undefined, isError: false });

    renderAdapter();

    // neither the map nor the error — the loader is showing
    expect(screen.queryByTestId("ssm")).not.toBeInTheDocument();
    expect(screen.queryByText(/unavailable/i)).not.toBeInTheDocument();
  });

  it("stays loading while a celestial query is still in flight", () => {
    mockUseSolarSystem.mockReturnValue({
      data: { data: SYSTEM },
      isError: false,
    });
    // the system query resolved, but one planet's SDE lookup has not yet
    mockLoadingIds.add(40000010);

    renderAdapter();

    // `settled` must block on the body fan-out, not only the system query —
    // the disabled star query stays not-loading, so it is the pending planet
    // holding the loader here.
    expect(screen.queryByTestId("ssm")).not.toBeInTheDocument();
    expect(screen.queryByText(/unavailable/i)).not.toBeInTheDocument();
  });

  it("marks every SDE lookup immutable and low-retry", () => {
    mockUseSolarSystem.mockReturnValue({
      data: { data: SYSTEM },
      isError: false,
    });

    renderAdapter();

    // the whole fan-out is covered — star, planets, moons, stations, stargates
    expect([...new Set(mockSeenQueries.map((q) => q._kind))].sort()).toEqual(
      [...HOVER_KINDS].sort(),
    );
    // SDE data is immutable, so nothing here may refetch on window focus…
    expect(mockSeenQueries.filter((q) => q.staleTime !== Infinity)).toEqual([]);
    // …and one flaky request must not hold the loader through the default 3 retries
    expect(mockSeenQueries.filter((q) => q.retry !== 1)).toEqual([]);
  });

  it("does not resolve a star name when the system has no star", () => {
    mockUseSolarSystem.mockReturnValue({
      data: { data: { ...SYSTEM, star_id: undefined } },
      isError: false,
    });

    renderAdapter();

    const map = screen.getByTestId("ssm");
    // the map's `star` prop is required, so an absent star gets a sentinel id…
    expect(map).toHaveAttribute("data-star-id", "0");
    expect(map).toHaveAttribute("data-star-radius", "0");
    // …which must not be looked up as if it were a real star
    const label = screen.getByTestId("label-star");
    expect(label).toHaveTextContent("Star");
    expect(label).not.toHaveTextContent("star-name");
  });

  it("keeps the loading fallbacks at the caller's height", () => {
    mockUseSolarSystem.mockReturnValue({
      data: { data: SYSTEM },
      isError: false,
    });

    renderAdapter(900);

    // the settled map sits in a wrapper carrying the caller's height and fills it
    expect(screen.getByTestId("ssm").parentElement).toHaveStyle({
      height: "900px",
    });
    expect(screen.getByTestId("ssm")).toHaveAttribute("data-height", "100%");

    // so does next/dynamic's chunk-loading fallback, which cannot see the prop
    const fallback = render(
      <MantineProvider>{mockDynamicLoading?.()}</MantineProvider>,
    );
    expect(fallback.container.innerHTML).toContain("height: 100%");
  });
});
