import "@testing-library/jest-dom/jest-globals";

import type { SolarSystemMapProps } from "@jitaspace/solar-system-map";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

const mockUseSolarSystem = jest.fn();

// The map pulls in three.js/WebGL; the adapter loads it via next/dynamic and
// also prefetches it on mount. Stub both so no GPU/ESM code runs under jsdom,
// and surface the props the adapter computed as data-attributes to assert on.
const HOVER_KINDS = ["star", "planet", "moon", "station", "stargate"] as const;

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => (props: SolarSystemMapProps) => (
    <div
      data-testid="ssm"
      data-star-id={String(props.star.id)}
      data-star-radius={String(props.star.radius)}
      data-planets={String(props.planets.length)}
      data-planet0-moons={String(props.planets[0]?.moons.length ?? -1)}
      data-stations={String(props.stations.length)}
      data-stargates={String(props.stargates.length)}
    >
      {HOVER_KINDS.map((kind) => (
        <span key={kind} data-testid={`label-${kind}`}>
          {props.renderLabel?.({ kind, id: 1 })}
        </span>
      ))}
    </div>
  ),
}));

jest.mock("@jitaspace/solar-system-map", () => ({
  __esModule: true,
  SolarSystemMap: () => null,
}));

jest.mock("@jitaspace/hooks", () => ({
  useSolarSystem: (id: number) => mockUseSolarSystem(id),
}));

// Tag each query-options call so the react-query stub can dispatch to fixtures.
jest.mock("@jitaspace/sde-client", () => ({
  getStarByIdQueryOptions: (id: number) => ({ _kind: "star", _id: id }),
  getPlanetByIdQueryOptions: (id: number) => ({ _kind: "planet", _id: id }),
  getMoonByIdQueryOptions: (id: number) => ({ _kind: "moon", _id: id }),
  getStationByIdQueryOptions: (id: number) => ({ _kind: "station", _id: id }),
  getStargateByIdQueryOptions: (id: number) => ({ _kind: "stargate", _id: id }),
}));

jest.mock("@tanstack/react-query", () => {
  // SDE bodies keyed by kind+id. A body without a `position` models an SDE
  // record that hasn't resolved (or lacks coordinates) and must be dropped.
  const BODIES: Record<string, Record<number, unknown>> = {
    star: { 40000001: { radius: 5e8 } },
    planet: {
      40000010: { position: { x: 4e10, y: 0, z: 2e10 }, radius: 6e6 },
      40000020: { radius: 5e7 }, // no position → dropped
    },
    moon: {
      40000101: { position: { x: 4e10, y: 0, z: 2e10 }, radius: 2e5 },
      40000102: { radius: 1e5 }, // no position → dropped
    },
    station: {
      60000001: { position: { x: 41e9, y: 1e9, z: 20e9 } },
      60000002: {}, // no position → dropped
    },
    stargate: { 50000001: { position: { x: 0, y: 0, z: -4e12 } } },
  };
  // React Query exposes `data: undefined` for a disabled/unresolved query, and
  // `data: { data: body }` (the axios envelope) once it resolves.
  const result = (q: { _kind: string; _id: number }) => {
    const body = BODIES[q._kind]?.[q._id];
    return {
      data: body === undefined ? undefined : { data: body },
      isLoading: false,
    };
  };
  return {
    useQuery: (opts: { _kind: string; _id: number }) => result(opts),
    useQueries: ({ queries }: { queries: { _kind: string; _id: number }[] }) =>
      queries.map(result),
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

function renderAdapter() {
  return render(
    <MantineProvider>
      <SolarSystem3D solarSystemId={30000001} />
    </MantineProvider>,
  );
}

describe("SolarSystem3D adapter", () => {
  beforeEach(() => {
    mockUseSolarSystem.mockReset();
  });

  it("maps resolved SDE bodies into map props, dropping position-less ones", () => {
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
});
