import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react";

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */

// Stub the auth store so we can drive its persist hydration lifecycle without
// loading the real store (and its generated-client deps).
let mockHydrated = false;
const mockOnFinishHydration = jest.fn<(cb: () => void) => () => void>();

jest.mock("@jitaspace/hooks", () => ({
  useAuthStore: {
    persist: {
      hasHydrated: () => mockHydrated,
      onFinishHydration: mockOnFinishHydration.mockReturnValue(() => undefined),
    },
  },
}));

const { useAuthStoreHasHydrated } = require("~/hooks/useAuthStoreHasHydrated");

describe("useAuthStoreHasHydrated", () => {
  beforeEach(() => {
    mockHydrated = false;
    mockOnFinishHydration.mockClear().mockReturnValue(() => undefined);
  });

  it("returns false until hydration finishes, then flips to true", () => {
    const { result } = renderHook(() => useAuthStoreHasHydrated());

    expect(result.current).toBe(false);

    // Fire the hydration-finished listener the hook registered.
    const onFinish = mockOnFinishHydration.mock.calls[0]?.[0];
    act(() => {
      onFinish?.();
    });

    expect(result.current).toBe(true);
  });

  it("returns true immediately when the store is already hydrated", () => {
    mockHydrated = true;

    const { result } = renderHook(() => useAuthStoreHasHydrated());

    expect(result.current).toBe(true);
  });
});
