import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

import type * as Module from "../src/hooks/contracts/useContractItemsAndBids";

// @swc/jest does not hoist jest.mock above imports, so the hook under test is
// required lazily below. The generated ESI client is replaced so axios never
// loads: each options builder records the arguments it was called with, in
// its own positional order, and answers through `mockFetch`.
type Headers = Record<string, string> | undefined;
const mockFetch =
  jest.fn<(endpoint: string, args: unknown[]) => Promise<{ data: unknown }>>();

const options =
  (endpoint: string) =>
  (...args: unknown[]) => ({
    queryKey: [endpoint, ...args.filter((arg) => typeof arg !== "object")],
    queryFn: () => mockFetch(endpoint, args),
  });

jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  getCharactersCharacterIdContractsContractIdItemsQueryOptions:
    options("character-items"),
  getCorporationsCorporationIdContractsContractIdItemsQueryOptions:
    options("corporation-items"),
  getCharactersCharacterIdContractsContractIdBidsQueryOptions:
    options("character-bids"),
  getCorporationsCorporationIdContractsContractIdBidsQueryOptions:
    options("corporation-bids"),
}));

// The authenticated subjects, per kind, as useEsiSubjects reports them.
const mockSubjects: Record<string, { id: number; authHeaders: Headers }[]> = {
  character: [{ id: 1001, authHeaders: { Authorization: "Bearer char" } }],
  corporation: [{ id: 2001, authHeaders: { Authorization: "Bearer corp" } }],
};
jest.mock("../src/hooks/auth", () => ({
  __esModule: true,
  useEsiSubjects: ({ kind }: { kind: string }) => mockSubjects[kind] ?? [],
}));

const { useContractItemsAndBids } =
  require("../src/hooks/contracts/useContractItemsAndBids") as typeof Module;

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

const items = [
  {
    record_id: 1,
    type_id: 587,
    quantity: 1,
    is_included: true,
    is_singleton: false,
  },
];
const bids = [
  { bid_id: 9, bidder_id: 1002, amount: 5_000_000, date_bid: "2026-11-01" },
];

const calledEndpoints = () =>
  mockFetch.mock.calls.map(([endpoint]) => endpoint);

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockImplementation((endpoint) =>
    Promise.resolve({ data: endpoint.endsWith("bids") ? bids : items }),
  );
});

describe("useContractItemsAndBids", () => {
  it("reads a character's contract through the character endpoints", async () => {
    const { result } = renderHook(
      () =>
        useContractItemsAndBids(
          42,
          { kind: "character", subjectId: 1001 },
          { isAuction: true },
        ),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.bids).toEqual(bids));
    expect(result.current.items).toEqual(items);
    expect(result.current.canRead).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(calledEndpoints().sort()).toEqual([
      "character-bids",
      "character-items",
    ]);
    // Character endpoints take (character_id, contract_id, headers).
    expect(mockFetch).toHaveBeenCalledWith("character-items", [
      1001,
      42,
      { Authorization: "Bearer char" },
    ]);
    expect(mockFetch).toHaveBeenCalledWith("character-bids", [
      1001,
      42,
      { Authorization: "Bearer char" },
    ]);
  });

  it("reads a corporation's contract through the corporation endpoints", async () => {
    const { result } = renderHook(
      () =>
        useContractItemsAndBids(
          42,
          { kind: "corporation", subjectId: 2001 },
          { isAuction: true },
        ),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.bids).toEqual(bids));
    expect(result.current.items).toEqual(items);
    expect(calledEndpoints().sort()).toEqual([
      "corporation-bids",
      "corporation-items",
    ]);
    // Corporation endpoints take (contract_id, corporation_id, …): the
    // reverse of the character ones, and bids take query params before the
    // headers.
    expect(mockFetch).toHaveBeenCalledWith("corporation-items", [
      42,
      2001,
      { Authorization: "Bearer corp" },
    ]);
    expect(mockFetch).toHaveBeenCalledWith("corporation-bids", [
      42,
      2001,
      undefined,
      { Authorization: "Bearer corp" },
    ]);
  });

  it("fetches no bids for a contract that is not an auction", async () => {
    const { result } = renderHook(
      () => useContractItemsAndBids(42, { kind: "character", subjectId: 1001 }),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.items).toEqual(items));
    expect(result.current.bids).toBeUndefined();
    expect(calledEndpoints()).toEqual(["character-items"]);
  });

  it("holds every request without a contract id", () => {
    const { result } = renderHook(
      () =>
        useContractItemsAndBids(
          undefined,
          { kind: "character", subjectId: 1001 },
          { isAuction: true },
        ),
      { wrapper: wrapper() },
    );

    expect(result.current.canRead).toBe(true);
    expect(result.current.items).toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("holds every request without a source, or one no token can read", () => {
    const { result: noSource } = renderHook(
      () => useContractItemsAndBids(42, undefined, { isAuction: true }),
      { wrapper: wrapper() },
    );
    // A corporation this session holds no token with the role for.
    const { result: unknown } = renderHook(
      () =>
        useContractItemsAndBids(
          42,
          { kind: "corporation", subjectId: 2999 },
          { isAuction: true },
        ),
      { wrapper: wrapper() },
    );

    expect(noSource.current.canRead).toBe(false);
    expect(unknown.current.canRead).toBe(false);
    expect(unknown.current.isLoading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("reports the items request's error", async () => {
    const failure = new Error("403");
    mockFetch.mockImplementation((endpoint) =>
      endpoint === "character-items"
        ? Promise.reject(failure)
        : Promise.resolve({ data: bids }),
    );
    const { result } = renderHook(
      () =>
        useContractItemsAndBids(
          42,
          { kind: "character", subjectId: 1001 },
          { isAuction: true },
        ),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.error).toBe(failure));
    expect(result.current.items).toBeUndefined();
  });

  it("reports the bids request's error when the items load", async () => {
    const failure = new Error("bids failed");
    mockFetch.mockImplementation((endpoint) =>
      endpoint === "corporation-bids"
        ? Promise.reject(failure)
        : Promise.resolve({ data: items }),
    );
    const { result } = renderHook(
      () =>
        useContractItemsAndBids(
          42,
          { kind: "corporation", subjectId: 2001 },
          { isAuction: true },
        ),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.error).toBe(failure));
    expect(result.current.items).toEqual(items);
  });

  it("is loading while either request is in flight", async () => {
    let release: (value: { data: unknown }) => void = () => undefined;
    mockFetch.mockImplementation((endpoint) =>
      endpoint === "character-bids"
        ? new Promise((resolve) => {
            release = resolve;
          })
        : Promise.resolve({ data: items }),
    );
    const { result } = renderHook(
      () =>
        useContractItemsAndBids(
          42,
          { kind: "character", subjectId: 1001 },
          { isAuction: true },
        ),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.items).toEqual(items));
    expect(result.current.isLoading).toBe(true);
    release({ data: bids });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.bids).toEqual(bids);
  });
});
