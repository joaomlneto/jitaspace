import "@testing-library/jest-dom/jest-globals";

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// EsiClientSSOAccessTokenInjector renders its children and, on mount, (a)
// rehydrates the persisted auth store and (b) schedules a timer that refreshes
// any character whose access token is within ~40s of expiry. We mock the auth
// store and the server action so we can drive both the "nothing to refresh"
// and "refresh-and-store" branches with fake timers.
// ---------------------------------------------------------------------------

const mockAddCharacter = jest.fn<() => Promise<void>>();
const mockRehydrate = jest.fn<() => Promise<void>>();
const mockRefreshCharacterToken =
  jest.fn<(token: string) => Promise<{ accessToken: string; refreshTokenData: string }>>();

let storeState: {
  addCharacter: typeof mockAddCharacter;
  characters: Record<string, { accessTokenExpirationDate: string; refreshToken: string }>;
} = { addCharacter: mockAddCharacter, characters: {} };

const useAuthStore = (() => storeState) as unknown as {
  (): typeof storeState;
  persist: { rehydrate: () => Promise<void> };
};
useAuthStore.persist = { rehydrate: () => mockRehydrate() };

jest.mock("@jitaspace/hooks", () => ({
  useAuthStore,
}));

jest.mock("~/components/EsiClientSSOAccessTokenInjector.actions", () => ({
  refreshCharacterToken: (token: string) => mockRefreshCharacterToken(token),
}));

function renderInjector() {
  const {
    EsiClientSSOAccessTokenInjector,
  } = require("~/components/EsiClientSSOAccessTokenInjector");
  return render(
    <EsiClientSSOAccessTokenInjector>
      <div data-testid="child">hello</div>
    </EsiClientSSOAccessTokenInjector>,
  );
}

describe("EsiClientSSOAccessTokenInjector", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockAddCharacter.mockReset().mockResolvedValue(undefined);
    mockRehydrate.mockReset().mockResolvedValue(undefined);
    mockRefreshCharacterToken
      .mockReset()
      .mockResolvedValue({ accessToken: "NEW_AT", refreshTokenData: "NEW_RT" });
    storeState = { addCharacter: mockAddCharacter, characters: {} };
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("renders its children and rehydrates the persisted store", () => {
    renderInjector();
    expect(screen.getByTestId("child")).toHaveTextContent("hello");
    expect(mockRehydrate).toHaveBeenCalledTimes(1);
  });

  it("refreshes only the near-expiry character, leaving far-future ones alone", async () => {
    // The timer is scheduled ~30s before the *soonest* expiry and, when it
    // fires, the clock (faked) has advanced to that point. So the near-expiry
    // character falls inside the <40s refresh window while the far-future one
    // (expiring an hour later) is filtered out -> exercises both filter sides.
    storeState = {
      addCharacter: mockAddCharacter,
      characters: {
        soon: {
          accessTokenExpirationDate: new Date(Date.now() - 1000).toISOString(),
          refreshToken: "RT_EXPIRING",
        },
        later: {
          accessTokenExpirationDate: new Date(
            Date.now() + 60 * 60 * 1000,
          ).toISOString(),
          refreshToken: "RT_FUTURE",
        },
      },
    };
    renderInjector();

    // The refresh timer is scheduled with a max(.. , 1000) delay; advance it.
    jest.advanceTimersByTime(2000);

    // Only the expiring character is refreshed; the future one is skipped.
    expect(mockRefreshCharacterToken).toHaveBeenCalledWith("RT_EXPIRING");
    expect(mockRefreshCharacterToken).not.toHaveBeenCalledWith("RT_FUTURE");
    expect(mockRefreshCharacterToken).toHaveBeenCalledTimes(1);

    await waitFor(() =>
      expect(mockAddCharacter).toHaveBeenCalledWith({
        accessToken: "NEW_AT",
        refreshToken: "NEW_RT",
      }),
    );
  });

  it("swallows refresh errors without crashing", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockRefreshCharacterToken.mockRejectedValueOnce(new Error("boom"));
    storeState = {
      addCharacter: mockAddCharacter,
      characters: {
        "1": {
          accessTokenExpirationDate: new Date(Date.now() - 1000).toISOString(),
          refreshToken: "RT_BAD",
        },
      },
    };
    renderInjector();

    jest.advanceTimersByTime(2000);

    expect(mockRefreshCharacterToken).toHaveBeenCalledWith("RT_BAD");
    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(mockAddCharacter).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
