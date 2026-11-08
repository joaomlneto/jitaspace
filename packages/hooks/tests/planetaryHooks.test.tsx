import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";

import type { ESIScope } from "@jitaspace/esi-metadata";

import type * as AuthStoreModule from "../src/hooks/auth/useAuthStore";
import type { CharacterSsoSession } from "../src/hooks/auth/useAuthStore";
import type * as LayoutModule from "../src/hooks/planetary/useCharacterPlanetLayout";
import type * as LayoutsModule from "../src/hooks/planetary/useCharacterPlanetLayouts";
import type * as PlanetsModule from "../src/hooks/planetary/useCharacterPlanets";
import type * as CustomsModule from "../src/hooks/planetary/useCorporationCustomsOffices";
import type * as SchematicModule from "../src/hooks/planetary/usePlanetSchematic";

// The single-subject hooks wrap generated hooks, so those are mocked and their
// arguments inspected. The rest build their own queries, so they run against a
// real QueryClient with the generated fetchers mocked.
//
// @swc/jest does not hoist jest.mock above imports, so the modules under test
// are required lazily below.
const mockUsePlanets = jest.fn();
const mockUseLayout = jest.fn();
const mockFetchLayout = jest.fn();
const mockFetchCustomsOffices = jest.fn();
const mockFetchSchematic = jest.fn();
const schematicQueryOptions = (schematicId: number) => ({
  queryKey: [
    {
      url: "/universe/schematics/:schematic_id",
      params: { schematic_id: schematicId },
    },
  ],
  queryFn: () => mockFetchSchematic(schematicId),
});

jest.mock("@jitaspace/auth-utils", () => ({
  __esModule: true,
  getEveSsoAccessTokenPayload: jest.fn(),
}));
jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  postCharactersAffiliation: jest.fn(),
  getCharactersCharacterIdRoles: jest.fn(),
  shouldRetryEsiRequest: () => false,
  useGetCharactersCharacterIdPlanets: (...args: unknown[]) =>
    mockUsePlanets(...args),
  useGetCharactersCharacterIdPlanetsPlanetId: (...args: unknown[]) =>
    mockUseLayout(...args),
  getCharactersCharacterIdPlanetsPlanetIdQueryOptions: (
    characterId: number,
    planetId: number,
    headers?: Record<string, string>,
  ) => ({
    queryKey: [
      {
        url: "/characters/:character_id/planets/:planet_id",
        params: { character_id: characterId, planet_id: planetId },
      },
    ],
    queryFn: () => mockFetchLayout(characterId, planetId, headers),
  }),
  getCorporationsCorporationIdCustomsOfficesQueryKey: (
    corporationId: number,
  ) => [
    {
      url: "/corporations/:corporation_id/customs_offices",
      params: { corporation_id: corporationId },
    },
  ],
  getCorporationsCorporationIdCustomsOffices: (...args: unknown[]) =>
    mockFetchCustomsOffices(...args),
  // Shaped like the generated pair: options under the generated key, and a
  // hook that runs them with the caller's query overrides on top.
  getUniverseSchematicsSchematicIdQueryOptions: (schematicId: number) =>
    schematicQueryOptions(schematicId),
  useGetUniverseSchematicsSchematicId: (
    schematicId: number,
    _headers: unknown,
    options: { query?: Record<string, unknown> } = {},
  ) => useQuery({ ...schematicQueryOptions(schematicId), ...options.query }),
}));

const { useAuthStore } =
  require("../src/hooks/auth/useAuthStore") as typeof AuthStoreModule;
const { useCharacterPlanets } =
  require("../src/hooks/planetary/useCharacterPlanets") as typeof PlanetsModule;
const { useCharacterPlanetLayout } =
  require("../src/hooks/planetary/useCharacterPlanetLayout") as typeof LayoutModule;
const { useCharacterPlanetLayouts, colonyKey } =
  require("../src/hooks/planetary/useCharacterPlanetLayouts") as typeof LayoutsModule;
const { useCorporationCustomsOffices, corporationCustomsOfficesQueryOptions } =
  require("../src/hooks/planetary/useCorporationCustomsOffices") as typeof CustomsModule;
const { usePlanetSchematic, usePlanetSchematics } =
  require("../src/hooks/planetary/usePlanetSchematic") as typeof SchematicModule;

const PLANETS: ESIScope = "esi-planets.manage_planets.v1";
const CUSTOMS: ESIScope = "esi-planets.read_customs_offices.v1";

const character = ({
  characterId,
  corporationId = 0,
  scopes = [],
  roles = [],
}: {
  characterId: number;
  corporationId?: number;
  scopes?: ESIScope[];
  roles?: CharacterSsoSession["corporationRoles"];
}): CharacterSsoSession => ({
  accessToken: `token-${characterId}`,
  accessTokenExpirationDate: new Date(0).toString(),
  refreshToken: `refresh-${characterId}`,
  characterId,
  corporationId,
  corporationRoles: roles,
  accessTokenPayload: {
    scp: scopes,
    sub: `CHARACTER:EVE:${characterId}`,
    name: `Character ${characterId}`,
    jti: "",
    kid: "",
    azp: "",
    tenant: "",
    tier: "",
    region: "",
    aud: "",
    owner: "",
    exp: 0,
    iat: 0,
    iss: "",
  },
});

const login = (...sessions: CharacterSsoSession[]) =>
  useAuthStore.setState({
    characters: Object.fromEntries(sessions.map((s) => [s.characterId, s])),
    selectedCharacter: sessions[0]?.characterId ?? null,
  });

const makeWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
let wrapper: ReturnType<typeof makeWrapper>;

const response = <T,>(data: T, headers: Record<string, string> = {}) => ({
  data,
  headers,
  status: 200,
  statusText: "OK",
});

const layout = (pinCount: number) => ({
  links: [],
  routes: [],
  pins: Array.from({ length: pinCount }, (_, index) => ({
    pin_id: index + 1,
    type_id: 2254,
    latitude: 0,
    longitude: 0,
  })),
});

/** The `query` options the hook passed to a mocked generated hook. */
const queryOptionsFrom = (mock: jest.Mock, index: number) =>
  (mock.mock.calls.at(-1)?.[index] as { query: { enabled: boolean } }).query;

beforeEach(() => {
  useAuthStore.setState({ characters: {}, selectedCharacter: null });
  wrapper = makeWrapper();
  mockUsePlanets.mockReset().mockReturnValue({});
  mockUseLayout.mockReset().mockReturnValue({});
  mockFetchLayout.mockReset();
  mockFetchCustomsOffices.mockReset();
  mockFetchSchematic.mockReset();
});

describe("useCharacterPlanets", () => {
  it("signs with the character's planets token", () => {
    login(character({ characterId: 100, scopes: [PLANETS] }));

    const { result } = renderHook(() => useCharacterPlanets(100));

    expect(mockUsePlanets).toHaveBeenCalledWith(
      100,
      { Authorization: "Bearer token-100" },
      expect.anything(),
    );
    expect(queryOptionsFrom(mockUsePlanets, 2).enabled).toBe(true);
    expect(result.current.hasToken).toBe(true);
  });

  it("stays disabled without the scope", () => {
    login(character({ characterId: 100 }));

    const { result } = renderHook(() => useCharacterPlanets(100));

    expect(queryOptionsFrom(mockUsePlanets, 2).enabled).toBe(false);
    expect(result.current.hasToken).toBe(false);
  });

  it("holds the request when not enabled, but still reports the token", () => {
    login(character({ characterId: 100, scopes: [PLANETS] }));

    const { result } = renderHook(() =>
      useCharacterPlanets(100, { enabled: false }),
    );

    expect(queryOptionsFrom(mockUsePlanets, 2).enabled).toBe(false);
    expect(result.current.hasToken).toBe(true);
  });

  it("stays disabled without a character, rather than querying character 0", () => {
    login(character({ characterId: 100, scopes: [PLANETS] }));

    renderHook(() => useCharacterPlanets(undefined));

    expect(mockUsePlanets.mock.calls.at(-1)?.[0]).toBe(0);
    expect(queryOptionsFrom(mockUsePlanets, 2).enabled).toBe(false);
  });
});

describe("useCharacterPlanetLayout", () => {
  it("requests the colony with its owner's token", () => {
    login(character({ characterId: 100, scopes: [PLANETS] }));

    renderHook(() => useCharacterPlanetLayout(100, 40000001));

    expect(mockUseLayout).toHaveBeenCalledWith(
      100,
      40000001,
      { Authorization: "Bearer token-100" },
      expect.anything(),
    );
    expect(queryOptionsFrom(mockUseLayout, 3).enabled).toBe(true);
  });

  it("stays disabled until it knows the planet", () => {
    login(character({ characterId: 100, scopes: [PLANETS] }));

    renderHook(() => useCharacterPlanetLayout(100, undefined));

    expect(queryOptionsFrom(mockUseLayout, 3).enabled).toBe(false);
  });
});

describe("useCharacterPlanetLayouts", () => {
  it("fetches each colony with its own owner's token, keyed by colony", async () => {
    login(
      character({ characterId: 100, scopes: [PLANETS] }),
      character({ characterId: 101, scopes: [PLANETS] }),
    );
    mockFetchLayout.mockImplementation((characterId) =>
      Promise.resolve(response(layout(characterId === 100 ? 1 : 2))),
    );

    const { result } = renderHook(
      () =>
        useCharacterPlanetLayouts([
          { characterId: 100, planetId: 1 },
          { characterId: 101, planetId: 2 },
        ]),
      { wrapper },
    );

    await waitFor(() => expect(result.current.pendingKeys).toEqual([]));

    expect(result.current.data["100:1"]?.pins).toHaveLength(1);
    expect(result.current.data["101:2"]?.pins).toHaveLength(2);
    expect(mockFetchLayout).toHaveBeenCalledWith(100, 1, {
      Authorization: "Bearer token-100",
    });
    expect(mockFetchLayout).toHaveBeenCalledWith(101, 2, {
      Authorization: "Bearer token-101",
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("does not request a colony no logged-in character can read", async () => {
    login(
      character({ characterId: 100, scopes: [PLANETS] }),
      character({ characterId: 101 }),
    );
    mockFetchLayout.mockImplementation(() =>
      Promise.resolve(response(layout(1))),
    );

    const { result } = renderHook(
      () =>
        useCharacterPlanetLayouts([
          { characterId: 100, planetId: 1 },
          { characterId: 101, planetId: 2 },
          { characterId: 999, planetId: 3 },
        ]),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data["100:1"]).toBeDefined());

    expect(mockFetchLayout).toHaveBeenCalledTimes(1);
    expect(result.current.unauthorized).toEqual([
      { characterId: 101, planetId: 2 },
      { characterId: 999, planetId: 3 },
    ]);
  });

  it("attributes a failure to its colony and keeps the others", async () => {
    login(character({ characterId: 100, scopes: [PLANETS] }));
    mockFetchLayout.mockImplementation((_characterId, planetId) =>
      planetId === 1
        ? Promise.reject(new Error("boom"))
        : Promise.resolve(response(layout(3))),
    );

    const { result } = renderHook(
      () =>
        useCharacterPlanetLayouts([
          { characterId: 100, planetId: 1 },
          { characterId: 100, planetId: 2 },
        ]),
      { wrapper },
    );

    await waitFor(() => expect(result.current.errors).toHaveLength(1));
    await waitFor(() => expect(result.current.data["100:2"]).toBeDefined());

    expect(result.current.errors[0]).toMatchObject({
      characterId: 100,
      planetId: 1,
    });
    expect(result.current.data["100:1"]).toBeUndefined();
    expect(result.current.failedKeys).toEqual(["100:1"]);
  });

  it("keeps a failed colony failed, not loading, while it is retried", async () => {
    login(character({ characterId: 100, scopes: [PLANETS] }));
    mockFetchLayout.mockImplementation(() => Promise.reject(new Error("boom")));

    const { result } = renderHook(
      () => useCharacterPlanetLayouts([{ characterId: 100, planetId: 1 }]),
      { wrapper },
    );
    await waitFor(() => expect(result.current.failedKeys).toEqual(["100:1"]));

    // The window regains focus: react-query refetches the failed, stale query
    // and resets it to pending with no error while it runs.
    let release: (() => void) | undefined;
    mockFetchLayout.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          release = () => {
            reject(new Error("boom"));
          };
        }),
    );
    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await waitFor(() => expect(release).toBeDefined());

    expect(result.current.pendingKeys).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.failedKeys).toEqual(["100:1"]);

    act(() => release?.());
    await waitFor(() => expect(result.current.errors).toHaveLength(1));
  });

  it("reports colonies still on their first load as pending", () => {
    login(character({ characterId: 100, scopes: [PLANETS] }));
    mockFetchLayout.mockImplementation(() => new Promise(() => undefined));

    const { result } = renderHook(
      () => useCharacterPlanetLayouts([{ characterId: 100, planetId: 1 }]),
      { wrapper },
    );

    expect(result.current.pendingKeys).toEqual(["100:1"]);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns nothing for no colonies", () => {
    login(character({ characterId: 100, scopes: [PLANETS] }));

    const { result } = renderHook(() => useCharacterPlanetLayouts([]), {
      wrapper,
    });

    expect(result.current).toMatchObject({
      data: {},
      errors: [],
      failedKeys: [],
      unauthorized: [],
      pendingKeys: [],
      isLoading: false,
    });
  });

  it("keys colonies by character and planet", () => {
    expect(colonyKey({ characterId: 1, planetId: 2 })).toBe("1:2");
  });
});

describe("useCorporationCustomsOffices", () => {
  const office = (officeId: number) => ({
    office_id: officeId,
    system_id: 30000142,
    allow_access_with_standings: false,
    allow_alliance_access: false,
    reinforce_exit_start: 18,
    reinforce_exit_end: 20,
  });

  it("walks every page with a Director's token", async () => {
    login(
      character({
        characterId: 100,
        corporationId: 98000001,
        scopes: [CUSTOMS],
        roles: ["Director"],
      }),
    );
    mockFetchCustomsOffices.mockImplementation((_id, params) => {
      const { page } = params as { page: number };
      return Promise.resolve(response([office(page)], { "x-pages": "2" }));
    });

    const { result } = renderHook(
      () => useCorporationCustomsOffices(98000001),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasToken).toBe(true);
    expect(result.current.data?.data.map((o) => o.office_id)).toEqual([1, 2]);
    expect(mockFetchCustomsOffices).toHaveBeenCalledWith(
      98000001,
      { page: 1 },
      { Authorization: "Bearer token-100" },
      expect.anything(),
    );
  });

  it("does not ask without the Director role", () => {
    login(
      character({
        characterId: 100,
        corporationId: 98000001,
        scopes: [CUSTOMS],
        roles: ["Accountant"],
      }),
    );

    const { result } = renderHook(
      () => useCorporationCustomsOffices(98000001),
      { wrapper },
    );

    expect(result.current.hasToken).toBe(false);
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetchCustomsOffices).not.toHaveBeenCalled();
  });

  it("keys every page under the generated key plus the all-pages marker", () => {
    // The key the generated useMultipleCorporationCustomsOffices builds too,
    // through the same esiPagedQueryOptions, so the two share one entry.
    // Distinct from the generated single-page key, whose data is one page.
    const { queryKey } = corporationCustomsOfficesQueryOptions(1, {});
    expect(queryKey).toEqual([
      {
        url: "/corporations/:corporation_id/customs_offices",
        params: { corporation_id: 1 },
      },
      "all-pages",
    ]);
  });
});

describe("usePlanetSchematic", () => {
  const schematic = (name: string) =>
    response({ cycle_time: 3600, schematic_name: name });

  it("keeps the response exactly as ESI sends it", async () => {
    mockFetchSchematic.mockImplementation(() =>
      Promise.resolve(schematic("Superconductors")),
    );

    const { result } = renderHook(() => usePlanetSchematic(65), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toEqual({
      cycle_time: 3600,
      schematic_name: "Superconductors",
    });
    expect(mockFetchSchematic).toHaveBeenCalledWith(65);
  });

  it("does not query without an id", () => {
    renderHook(() => usePlanetSchematic(undefined), { wrapper });
    renderHook(() => usePlanetSchematic(0), { wrapper });

    expect(mockFetchSchematic).not.toHaveBeenCalled();
  });

  it("fetches several, keyed by the id each was requested by", async () => {
    mockFetchSchematic.mockImplementation((schematicId) =>
      Promise.resolve(schematic(`Schematic ${schematicId as number}`)),
    );

    const { result } = renderHook(() => usePlanetSchematics([65, 0, 66]), {
      wrapper,
    });

    await waitFor(() =>
      expect(Object.keys(result.current.data)).toHaveLength(2),
    );
    expect(result.current.data[65]?.schematic_name).toBe("Schematic 65");
    expect(result.current.data[66]?.schematic_name).toBe("Schematic 66");
    expect(mockFetchSchematic).toHaveBeenCalledTimes(2);
  });

  it("shares one cache entry with the single hook without either reshaping it", async () => {
    mockFetchSchematic.mockImplementation((schematicId) =>
      Promise.resolve(schematic(`Schematic ${schematicId as number}`)),
    );

    // Both mounted on the same client, as a page using both would be. The
    // entry is written once and read by both; it must suit them both.
    const { result } = renderHook(
      () => ({
        one: usePlanetSchematic(65),
        many: usePlanetSchematics([65]),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.many.data[65]).toBeDefined());
    expect(result.current.one.data?.data.schematic_name).toBe("Schematic 65");
    expect(Object.keys(result.current.many.data)).toEqual(["65"]);
    expect(mockFetchSchematic).toHaveBeenCalledTimes(1);
  });
});
