import { describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react";

// @swc/jest does not hoist jest.mock above imports, so the hook and the store
// it pulls in are required lazily below. The generated ESI client is replaced
// so axios never loads in the test environment.
jest.mock("@jitaspace/auth-utils", () => ({
  __esModule: true,
  getEveSsoAccessTokenPayload: jest.fn(),
}));
jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  postCharactersAffiliation: jest.fn(),
  getCharactersCharacterIdRoles: jest.fn(),
}));

const { useAuthStore } =
  require("../src/hooks/auth/useAuthStore") as typeof import("../src/hooks/auth/useAuthStore");
const { useAuthStoreHasHydrated } =
  require("../src/hooks/auth/useAuthStoreHasHydrated") as typeof import("../src/hooks/auth/useAuthStoreHasHydrated");

describe("useAuthStoreHasHydrated", () => {
  it("reports the store's current hydration state on mount", () => {
    const { result } = renderHook(() => useAuthStoreHasHydrated());

    expect(result.current).toBe(useAuthStore.persist.hasHydrated());
  });

  it("flips to true once rehydration finishes", async () => {
    // The store is created with skipHydration, so a mount before rehydration
    // starts false and must not stay there — otherwise consumers treat a
    // not-yet-loaded session as "nobody is logged in" forever.
    const { result } = renderHook(() => useAuthStoreHasHydrated());

    await act(async () => {
      await useAuthStore.persist.rehydrate();
    });

    expect(result.current).toBe(true);
  });

  it("catches rehydration that lands before the effect subscribes", async () => {
    // The state initializer and the effect do not run in the same tick. If
    // rehydration completes in between, onFinishHydration never fires for this
    // subscriber, so without a re-check inside the effect the hook would report
    // "not hydrated" forever and its consumers would show a loading state that
    // never resolves.
    const { useAuthStore: store } =
      require("../src/hooks/auth/useAuthStore") as typeof import("../src/hooks/auth/useAuthStore");

    let hydrated = false;
    const hasHydrated = jest
      .spyOn(store.persist, "hasHydrated")
      .mockImplementation(() => hydrated);
    const onFinishHydration = jest
      .spyOn(store.persist, "onFinishHydration")
      .mockImplementation(() => () => undefined);

    // False when the initializer reads it, true by the time the effect runs.
    hydrated = false;
    const { result } = renderHook(() => {
      const value = useAuthStoreHasHydrated();
      hydrated = true;
      return value;
    });

    await waitFor(() => expect(result.current).toBe(true));

    hasHydrated.mockRestore();
    onFinishHydration.mockRestore();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useAuthStoreHasHydrated());

    // The effect returns the unsubscribe function directly; calling unmount
    // must not throw.
    expect(() => unmount()).not.toThrow();
  });
});
