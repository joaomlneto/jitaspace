import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";

// @swc/jest does not hoist jest.mock above imports, so the hook is required
// lazily below.
const mockPostUniverseIds = jest.fn<(names: string[]) => Promise<unknown>>();

jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  postUniverseIds: (names: string[]) => mockPostUniverseIds(names),
}));

const { useEsiUniverseIdsFromNames } =
  require("../src/hooks/universe/useEsiUniverseIdsFromNames") as typeof import("../src/hooks/universe/useEsiUniverseIdsFromNames");

const RIFTER = { inventory_types: [{ id: 587, name: "Rifter" }] };

describe("useEsiUniverseIdsFromNames", () => {
  beforeEach(() => {
    mockPostUniverseIds.mockReset();
  });

  it("is settled, not loading, for an empty list — and asks ESI nothing", () => {
    // The ship scanner passes an empty list until a scan is pasted; this used
    // to report loading for the whole of that time.
    const { result } = renderHook(() => useEsiUniverseIdsFromNames([]));

    expect(result.current).toEqual({ loading: false });
    expect(mockPostUniverseIds).not.toHaveBeenCalled();
  });

  it("resolves the ids for the names", async () => {
    mockPostUniverseIds.mockResolvedValue({ status: 200, data: RIFTER });

    const { result } = renderHook(() => useEsiUniverseIdsFromNames(["Rifter"]));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(RIFTER);
  });

  it("stops loading and reports the error when the lookup fails", async () => {
    // The client rejects on a non-2xx response; the rejection used to go
    // unhandled and leave the hook loading forever.
    mockPostUniverseIds.mockRejectedValue(new Error("Request failed with 500"));

    const { result } = renderHook(() => useEsiUniverseIdsFromNames(["Rifter"]));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Request failed with 500");
  });

  it("ignores a late response for a list that has since changed", async () => {
    let resolveFirst: (value: unknown) => void = () => undefined;
    mockPostUniverseIds
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveFirst = resolve)),
      )
      .mockResolvedValueOnce({ status: 200, data: RIFTER });

    const { result, rerender } = renderHook(
      ({ names }: { names: string[] }) => useEsiUniverseIdsFromNames(names),
      { initialProps: { names: ["Slasher"] } },
    );
    rerender({ names: ["Rifter"] });
    await waitFor(() => expect(result.current.data).toEqual(RIFTER));

    resolveFirst({
      status: 200,
      data: { inventory_types: [{ id: 585, name: "Slasher" }] },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.current.data).toEqual(RIFTER);
  });
});
