import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

import type { ESIScope } from "@jitaspace/esi-metadata";

import type * as AuthStoreModule from "../src/hooks/auth/useAuthStore";
import type { CharacterSsoSession } from "../src/hooks/auth/useAuthStore";
import type * as FreelanceModule from "../src/hooks/freelance";

// The generated ESI client is replaced by fakes that record each request, so
// the hooks run against a real QueryClient end to end. The key and options
// builders mirror the generated ones' shape, which is what the cache-sharing
// assertions below depend on. @swc/jest does not hoist jest.mock above
// imports, so the modules under test are required lazily.
const mockListing = jest.fn();
const mockDetail = jest.fn();
const mockCharacterListing = jest.fn();
const mockParticipation = jest.fn();
const mockCorporationListing = jest.fn();
const mockParticipants = jest.fn();

jest.mock("@jitaspace/auth-utils", () => ({
  __esModule: true,
  getEveSsoAccessTokenPayload: jest.fn(),
}));
jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  shouldRetryEsiRequest: () => false,
  postCharactersAffiliation: jest.fn(),
  getCharactersCharacterIdRoles: jest.fn(),
  getFreelanceJobsListing: (...a: unknown[]) => mockListing(...a),
  getFreelanceJobsListingQueryKey: (params?: unknown) => [
    { url: "/freelance-jobs" },
    ...(params ? [params] : []),
  ],
  getFreelanceJobsDetail: (...a: unknown[]) => mockDetail(...a),
  getFreelanceJobsDetailQueryKey: (jobId: unknown) => [
    { url: "/freelance-jobs/:job_id", params: { job_id: jobId } },
  ],
  getCharactersFreelanceJobsListingQueryOptions: (
    characterId: unknown,
    headers: unknown,
  ) => ({
    queryKey: [
      {
        url: "/characters/:character_id/freelance-jobs",
        params: { character_id: characterId },
      },
    ],
    queryFn: () => mockCharacterListing(characterId, headers),
  }),
  getCharactersFreelanceJobsParticipationQueryOptions: (
    characterId: unknown,
    jobId: unknown,
    headers: unknown,
  ) => ({
    queryKey: [
      {
        url: "/characters/:character_id/freelance-jobs/:job_id/participation",
        params: { character_id: characterId, job_id: jobId },
      },
    ],
    queryFn: () => mockParticipation(characterId, jobId, headers),
  }),
  getCorporationsFreelanceJobsListing: (...a: unknown[]) =>
    mockCorporationListing(...a),
  getCorporationsFreelanceJobsListingQueryKey: (
    corporationId: unknown,
    params?: unknown,
  ) => [
    {
      url: "/corporations/:corporation_id/freelance-jobs",
      params: { corporation_id: corporationId },
    },
    ...(params ? [params] : []),
  ],
  getCorporationsFreelanceJobsParticipants: (...a: unknown[]) =>
    mockParticipants(...a),
  getCorporationsFreelanceJobsParticipantsQueryKey: (
    corporationId: unknown,
    jobId: unknown,
    params?: unknown,
  ) => [
    {
      url: "/corporations/:corporation_id/freelance-jobs/:job_id/participants",
      params: { corporation_id: corporationId, job_id: jobId },
    },
    ...(params ? [params] : []),
  ],
}));

// The persisted auth store never rehydrates under jsdom, and the multi-subject
// hooks stay pending until it has; the rest of the auth module is real.
jest.mock("../src/hooks/auth", () => ({
  __esModule: true,
  ...jest.requireActual<Record<string, unknown>>("../src/hooks/auth"),
  useAuthStoreHasHydrated: () => true,
}));

const { useAuthStore } =
  require("../src/hooks/auth/useAuthStore") as typeof AuthStoreModule;
const freelance = require("../src/hooks/freelance") as typeof FreelanceModule;
const {
  CHARACTER_FREELANCE_JOBS_SCOPE,
  CORPORATION_FREELANCE_JOBS_SCOPE,
  freelanceJobQueryKey,
  isFreelanceJobId,
  useCharacterFreelanceJobParticipation,
  useCharacterFreelanceJobs,
  useCharactersFreelanceJobParticipation,
  useCharactersFreelanceJobs,
  useCorporationFreelanceJobParticipants,
  useCorporationFreelanceJobs,
  useCorporationsFreelanceJobs,
  useFreelanceJob,
  useFreelanceJobs,
} = freelance;

const JOB_ID = "3868eaed-8278-4cb7-9709-7d7de9c20dc7";
const OTHER_JOB_ID = "9c6af0a9-f78b-4e65-beda-ae498045449c";

const job = (id: string, name = `Job ${id.slice(0, 4)}`) => ({
  id,
  name,
  state: "Active" as const,
  last_modified: "2026-10-30T00:00:00Z",
  progress: { current: 1, desired: 10 },
  reward: { initial: 100, remaining: 90 },
});

const ok = <T,>(data: T) => Promise.resolve({ data, headers: {}, status: 200 });

const character = ({
  characterId,
  corporationId = 1000,
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

let queryClient: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const pilot = (
  characterId: number,
  extra: Partial<CharacterSsoSession> = {},
) => ({
  ...character({
    characterId,
    scopes: [CHARACTER_FREELANCE_JOBS_SCOPE],
  }),
  ...extra,
});

const manager = (characterId: number, corporationId: number) =>
  character({
    characterId,
    corporationId,
    scopes: [CORPORATION_FREELANCE_JOBS_SCOPE],
    roles: ["Project_Manager"],
  });

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  useAuthStore.setState({ characters: {}, selectedCharacter: null });
  for (const mock of [
    mockListing,
    mockDetail,
    mockCharacterListing,
    mockParticipation,
    mockCorporationListing,
    mockParticipants,
  ]) {
    mock.mockReset();
  }
});

describe("isFreelanceJobId", () => {
  it("accepts a UUID in either case and rejects anything else", () => {
    expect(isFreelanceJobId(JOB_ID)).toBe(true);
    expect(isFreelanceJobId(JOB_ID.toUpperCase())).toBe(true);
    expect(isFreelanceJobId(`${JOB_ID}0`)).toBe(false);
    expect(isFreelanceJobId("nonsense")).toBe(false);
    expect(isFreelanceJobId(undefined)).toBe(false);
    expect(isFreelanceJobId(42)).toBe(false);
  });
});

/**
 * The request config every page fetch must get: ESI marks cursor pages
 * immutable for a year, so without the header the browser replays old pages.
 */
const FRESH_REQUEST = {
  signal: expect.any(AbortSignal),
  headers: { "Cache-Control": "no-cache" },
};

describe("useFreelanceJobs", () => {
  it("walks the active jobs backwards from the start, anonymously", async () => {
    mockListing.mockImplementation(() =>
      ok({ freelance_jobs: [job(JOB_ID)], cursor: { before: "b1" } }),
    );

    const { result } = renderHook(() => useFreelanceJobs(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([job(JOB_ID)]);
    expect(mockListing).toHaveBeenCalledTimes(1);
    const [params, headers, request] = mockListing.mock.calls[0]!;
    expect(params).toEqual({ limit: 100, before: "0" });
    expect(headers).toBeUndefined();
    expect(request).toEqual(FRESH_REQUEST);
  });

  it("walks forwards, filtered by corporation, to include finished jobs", async () => {
    mockListing.mockImplementation(() => ok({ freelance_jobs: [] }));

    const { result } = renderHook(
      () =>
        useFreelanceJobs({ corporationId: 98000001, includeFinished: true }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockListing.mock.calls[0]?.[0]).toEqual({
      limit: 100,
      corporation_id: 98000001,
      after: "0",
    });
  });

  it("keeps the two walks in separate cache entries", () => {
    const active = freelance.freelanceJobsQueryOptions();
    const everything = freelance.freelanceJobsQueryOptions({
      includeFinished: true,
    });
    expect(active.queryKey).not.toEqual(everything.queryKey);
  });

  it("does nothing while disabled", () => {
    renderHook(() => useFreelanceJobs({ enabled: false }), { wrapper });
    expect(mockListing).not.toHaveBeenCalled();
  });
});

describe("useFreelanceJob", () => {
  it("reads a job anonymously by default", async () => {
    login(pilot(1));
    mockDetail.mockImplementation(() => ok({ id: JOB_ID, name: "Haul" }));

    const { result } = renderHook(() => useFreelanceJob(JOB_ID), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ id: JOB_ID, name: "Haul" });
    // A logged-in character is not volunteered: a public job needs no token.
    expect(mockDetail.mock.calls[0]?.slice(0, 2)).toEqual([JOB_ID, undefined]);
    // ESI's 60 s public cache ignores the token, so the browser's is skipped.
    expect(mockDetail.mock.calls[0]?.[2]).toEqual(FRESH_REQUEST);
  });

  it("reads as the given character, under its own cache entry", async () => {
    login(pilot(1), pilot(2));
    mockDetail.mockImplementation(() => ok({ id: JOB_ID }));

    const { result } = renderHook(
      () => useFreelanceJob(JOB_ID, { characterId: 2 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockDetail.mock.calls[0]?.slice(0, 2)).toEqual([
      JOB_ID,
      { Authorization: "Bearer token-2" },
    ]);
    expect(
      queryClient.getQueryData(freelanceJobQueryKey(JOB_ID, 2)),
    ).toBeDefined();
    expect(
      queryClient.getQueryData(freelanceJobQueryKey(JOB_ID)),
    ).toBeUndefined();
  });

  it("waits for a token rather than falling back to an anonymous read", () => {
    login(pilot(1));
    renderHook(() => useFreelanceJob(JOB_ID, { characterId: 99 }), {
      wrapper,
    });
    expect(mockDetail).not.toHaveBeenCalled();
  });

  it("waits while its caller says so", () => {
    login(pilot(1));
    renderHook(() => useFreelanceJob(JOB_ID, { enabled: false }), {
      wrapper,
    });
    expect(mockDetail).not.toHaveBeenCalled();
  });

  it("never sends a malformed id to ESI", () => {
    renderHook(() => useFreelanceJob("not-a-job"), { wrapper });
    renderHook(() => useFreelanceJob(undefined), { wrapper });
    expect(mockDetail).not.toHaveBeenCalled();
  });
});

describe("useCharacterFreelanceJobs", () => {
  it("lists one character's jobs with its token", async () => {
    login(pilot(1));
    mockCharacterListing.mockImplementation(() =>
      ok({ freelance_jobs: [job(JOB_ID)] }),
    );

    const { result } = renderHook(() => useCharacterFreelanceJobs(1), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([job(JOB_ID)]);
    expect(mockCharacterListing).toHaveBeenCalledWith(1, {
      Authorization: "Bearer token-1",
    });
  });

  it("stays idle for a character without the scope, or none at all", () => {
    login(character({ characterId: 1 }));
    renderHook(() => useCharacterFreelanceJobs(1), { wrapper });
    renderHook(() => useCharacterFreelanceJobs(undefined), { wrapper });
    expect(mockCharacterListing).not.toHaveBeenCalled();
  });
});

describe("useCharactersFreelanceJobs", () => {
  beforeEach(() => {
    mockCharacterListing.mockImplementation((characterId: unknown) =>
      ok({
        freelance_jobs:
          characterId === 1 ? [job(JOB_ID)] : [job(JOB_ID), job(OTHER_JOB_ID)],
      }),
    );
  });

  it("merges every scoped character's jobs, tagged with the character", async () => {
    login(pilot(1), pilot(2), character({ characterId: 3 }));

    const { result } = renderHook(() => useCharactersFreelanceJobs(), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.subjectIds).toEqual([1, 2]);
    expect(result.current.data.map((row) => [row.subjectId, row.id])).toEqual([
      [1, JOB_ID],
      [2, JOB_ID],
      [2, OTHER_JOB_ID],
    ]);
  });

  it("queries only the characters it is given", async () => {
    login(pilot(1), pilot(2));

    const { result } = renderHook(() => useCharactersFreelanceJobs([2, 77]), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    // 77 is not logged in, so there is no token to ask with.
    expect(result.current.subjectIds).toEqual([2]);
    expect(mockCharacterListing).toHaveBeenCalledTimes(1);
    expect(mockCharacterListing).toHaveBeenCalledWith(2, {
      Authorization: "Bearer token-2",
    });
  });

  it("queries nothing for an empty list", async () => {
    login(pilot(1));

    const { result } = renderHook(() => useCharactersFreelanceJobs([]), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.subjectIds).toEqual([]);
    expect(mockCharacterListing).not.toHaveBeenCalled();
  });

  it("does not refetch when handed an equal list each render", async () => {
    login(pilot(1));

    const { result, rerender } = renderHook(
      () => useCharactersFreelanceJobs([1]),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    rerender();
    rerender();

    expect(mockCharacterListing).toHaveBeenCalledTimes(1);
  });

  it("shares its cache entry with the single-character hook", async () => {
    login(pilot(1));

    const multi = renderHook(() => useCharactersFreelanceJobs([1]), {
      wrapper,
    });
    await waitFor(() => expect(multi.result.current.isPending).toBe(false));
    const single = renderHook(() => useCharacterFreelanceJobs(1), { wrapper });

    // Served from the multi hook's entry on the very first render, without
    // waiting for a request of its own.
    expect(single.result.current.data).toEqual([job(JOB_ID)]);
  });
});

describe("useCharacterFreelanceJobParticipation", () => {
  it("reads one character's participation", async () => {
    login(pilot(1));
    mockParticipation.mockImplementation(() =>
      ok({ state: "Committed", contributed: 5, last_modified: "x" }),
    );

    const { result } = renderHook(
      () => useCharacterFreelanceJobParticipation(1, JOB_ID),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.contributed).toBe(5);
    expect(mockParticipation).toHaveBeenCalledWith(1, JOB_ID, {
      Authorization: "Bearer token-1",
    });
  });

  it("does not ask about a malformed job id", () => {
    login(pilot(1));
    renderHook(() => useCharacterFreelanceJobParticipation(1, "nope"), {
      wrapper,
    });
    expect(mockParticipation).not.toHaveBeenCalled();
  });

  it("pairs several characters' participation with each character", async () => {
    login(pilot(1), pilot(2), pilot(3));
    mockParticipation.mockImplementation((characterId: unknown) =>
      ok({ state: "Committed", contributed: Number(characterId) * 10 }),
    );

    const { result } = renderHook(
      () => useCharactersFreelanceJobParticipation(JOB_ID, [1, 3]),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(
      result.current.data.map((entry) => [
        entry.subjectId,
        entry.data.contributed,
      ]),
    ).toEqual([
      [1, 10],
      [3, 30],
    ]);
  });

  it("asks nobody for a malformed job id", async () => {
    login(pilot(1));

    const { result } = renderHook(
      () => useCharactersFreelanceJobParticipation("nope", [1]),
      { wrapper },
    );
    // Settled, not pending forever: a caller would otherwise spin.
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.pendingSubjectIds).toEqual([]);
    expect(mockParticipation).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([]);
  });
});

describe("useCorporationFreelanceJobs", () => {
  it("walks the corporation's whole history forwards with a manager's token", async () => {
    login(manager(1, 500));
    const fullPage = Array.from({ length: 100 }, (_, i) =>
      job(`${String(i).padStart(8, "0")}-0000-4000-8000-000000000000`),
    );
    mockCorporationListing
      .mockImplementationOnce(() =>
        ok({ freelance_jobs: fullPage, cursor: { after: "a1" } }),
      )
      .mockImplementationOnce(() => ok({ freelance_jobs: [job(JOB_ID)] }));

    const { result } = renderHook(() => useCorporationFreelanceJobs(500), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(101);
    expect(
      mockCorporationListing.mock.calls.map((call) => call.slice(0, 3)),
    ).toEqual([
      [500, { limit: 100, after: "0" }, { Authorization: "Bearer token-1" }],
      [500, { limit: 100, after: "a1" }, { Authorization: "Bearer token-1" }],
    ]);
    expect(mockCorporationListing.mock.calls.map((call) => call[3])).toEqual([
      FRESH_REQUEST,
      FRESH_REQUEST,
    ]);
  });

  it("needs the Project_Manager role as well as the scope", () => {
    login({ ...manager(1, 500), corporationRoles: ["Director"] });
    renderHook(() => useCorporationFreelanceJobs(500), { wrapper });
    expect(mockCorporationListing).not.toHaveBeenCalled();
  });

  it("merges several corporations, one request per corporation", async () => {
    login(manager(1, 500), manager(2, 500), manager(3, 600));
    mockCorporationListing.mockImplementation((corporationId: unknown) =>
      ok({
        freelance_jobs: [job(corporationId === 500 ? JOB_ID : OTHER_JOB_ID)],
      }),
    );

    const { result } = renderHook(() => useCorporationsFreelanceJobs(), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.subjectIds).toEqual([500, 600]);
    expect(result.current.data.map((row) => [row.subjectId, row.id])).toEqual([
      [500, JOB_ID],
      [600, OTHER_JOB_ID],
    ]);
    expect(mockCorporationListing).toHaveBeenCalledTimes(2);
  });

  it("can be narrowed to some corporations", async () => {
    login(manager(1, 500), manager(3, 600));
    mockCorporationListing.mockImplementation(() => ok({ freelance_jobs: [] }));

    const { result } = renderHook(() => useCorporationsFreelanceJobs([600]), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.subjectIds).toEqual([600]);
    expect(mockCorporationListing.mock.calls[0]?.[0]).toBe(600);
  });
});

describe("useCorporationFreelanceJobParticipants", () => {
  it("walks every participant with a manager of the creator corporation", async () => {
    login(pilot(9, { corporationId: 700 }), manager(1, 500));
    mockParticipants.mockImplementation(() =>
      ok({
        participants: [
          { id: 9, name: "Nine", state: "Committed", contributed: 3 },
        ],
      }),
    );

    const { result } = renderHook(
      () => useCorporationFreelanceJobParticipants(500, JOB_ID),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      { id: 9, name: "Nine", state: "Committed", contributed: 3 },
    ]);
    expect(mockParticipants.mock.calls[0]?.slice(0, 4)).toEqual([
      500,
      JOB_ID,
      { limit: 100, after: "0" },
      { Authorization: "Bearer token-1" },
    ]);
    expect(mockParticipants.mock.calls[0]?.[4]).toEqual(FRESH_REQUEST);
  });

  it("stays idle without a manager in that corporation", () => {
    login(manager(1, 500));
    renderHook(() => useCorporationFreelanceJobParticipants(600, JOB_ID), {
      wrapper,
    });
    renderHook(() => useCorporationFreelanceJobParticipants(500, "nope"), {
      wrapper,
    });
    expect(mockParticipants).not.toHaveBeenCalled();
  });
});
