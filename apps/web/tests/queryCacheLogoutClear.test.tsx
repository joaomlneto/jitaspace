import "@testing-library/jest-dom/jest-globals";

import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { QueryClient } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";

// Controllable stand-in for the Zustand auth store so we can drive logout.
type Listener = (state: AuthState, prev: AuthState) => void;
interface AuthState {
  characters: Record<number, unknown>;
  selectedCharacter: number | null;
}
let authState: AuthState = { characters: {}, selectedCharacter: null };
const listeners = new Set<Listener>();
function setAuthState(next: AuthState) {
  const prev = authState;
  authState = next;
  listeners.forEach((listener) => listener(authState, prev));
}
const useAuthStore = Object.assign(() => authState, {
  getState: () => authState,
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
});

jest.mock("@jitaspace/hooks", () => ({ useAuthStore }));
jest.mock("@jitaspace/esi-client", () => ({
  setAcceptLanguage: () => undefined,
  setUserAgent: () => undefined,
}));
jest.mock("@tanstack/react-query-devtools", () => ({
  ReactQueryDevtools: () => null,
}));
jest.mock("@tanstack/react-query-next-experimental", () => ({
  ReactQueryStreamedHydration: ({ children }: PropsWithChildren) => children,
}));

describe("query cache clear on logout", () => {
  beforeEach(() => {
    authState = { characters: {}, selectedCharacter: null };
    listeners.clear();
  });

  it("clears the cache when the last character logs out", () => {
    const clearSpy = jest.spyOn(QueryClient.prototype, "clear");
    authState = { characters: { 1: {} }, selectedCharacter: 1 };

    const { MyQueryClientProvider } = require("~/lib/MyQueryClientProvider");
    render(
      <MyQueryClientProvider>
        <div>content</div>
      </MyQueryClientProvider>,
    );
    expect(clearSpy).not.toHaveBeenCalled();

    act(() => setAuthState({ characters: {}, selectedCharacter: null }));
    expect(clearSpy).toHaveBeenCalled();

    clearSpy.mockRestore();
  });

  it("does not clear while another character remains signed in", () => {
    const clearSpy = jest.spyOn(QueryClient.prototype, "clear");
    authState = { characters: { 1: {}, 2: {} }, selectedCharacter: 1 };

    const { MyQueryClientProvider } = require("~/lib/MyQueryClientProvider");
    render(
      <MyQueryClientProvider>
        <div>content</div>
      </MyQueryClientProvider>,
    );

    act(() => setAuthState({ characters: { 2: {} }, selectedCharacter: 2 }));
    expect(clearSpy).not.toHaveBeenCalled();

    clearSpy.mockRestore();
  });
});
