import "@testing-library/jest-dom/jest-globals";

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// EsiClientSSOAccessTokenInjector renders its children and, on mount, (a)
// rehydrates the persisted auth store and (b) schedules a timer that refreshes
// any character whose access token is within ~40s of expiry. The server action
// reports a discriminated outcome: "refreshed" -> store it; "requires-reauth"
// (EVE will not renew the refresh token) -> drop the dead character; "error"
// -> log and keep retrying. We mock the auth store and the action so we can
// drive every branch with fake timers.
// ---------------------------------------------------------------------------

type RefreshOutcome =
  | { status: "refreshed"; accessToken: string; refreshTokenData: string }
  | { status: "requires-reauth" }
  | { status: "error"; message: string };

const mockAddCharacter =
  jest.fn<
    (params: { accessToken: string; refreshToken: string }) => Promise<void>
  >();
const mockRemoveCharacter = jest.fn<(characterId: number) => void>();
const mockRehydrate = jest.fn<() => Promise<void>>();
const mockRefreshCharacterToken =
  jest.fn<(token: string) => Promise<RefreshOutcome>>();

interface Character {
  characterId: number;
  accessTokenExpirationDate: string;
  refreshToken: string;
}

let storeState: {
  addCharacter: typeof mockAddCharacter;
  removeCharacter: typeof mockRemoveCharacter;
  characters: Record<string, Character>;
} = {
  addCharacter: mockAddCharacter,
  removeCharacter: mockRemoveCharacter,
  characters: {},
};

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

function nearExpiry(characterId: number, refreshToken: string): Character {
  return {
    characterId,
    accessTokenExpirationDate: new Date(Date.now() - 1000).toISOString(),
    refreshToken,
  };
}

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
    mockRemoveCharacter.mockReset();
    mockRehydrate.mockReset().mockResolvedValue(undefined);
    mockRefreshCharacterToken.mockReset().mockResolvedValue({
      status: "refreshed",
      accessToken: "NEW_AT",
      refreshTokenData: "NEW_RT",
    });
    storeState = {
      addCharacter: mockAddCharacter,
      removeCharacter: mockRemoveCharacter,
      characters: {},
    };
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
      removeCharacter: mockRemoveCharacter,
      characters: {
        soon: nearExpiry(1, "RT_EXPIRING"),
        later: {
          characterId: 2,
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

  it("drops the dead character when the refresh token is too old (requires reauth)", async () => {
    mockRefreshCharacterToken.mockResolvedValueOnce({ status: "requires-reauth" });
    storeState = {
      addCharacter: mockAddCharacter,
      removeCharacter: mockRemoveCharacter,
      characters: { "42": nearExpiry(42, "RT_OLD") },
    };
    renderInjector();

    jest.advanceTimersByTime(2000);

    expect(mockRefreshCharacterToken).toHaveBeenCalledWith("RT_OLD");
    await waitFor(() => expect(mockRemoveCharacter).toHaveBeenCalledWith(42));
    expect(mockAddCharacter).not.toHaveBeenCalled();
  });

  it("logs and keeps the character on a transient error outcome", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockRefreshCharacterToken.mockResolvedValueOnce({
      status: "error",
      message: "ESI down",
    });
    storeState = {
      addCharacter: mockAddCharacter,
      removeCharacter: mockRemoveCharacter,
      characters: { "7": nearExpiry(7, "RT_TRANSIENT") },
    };
    renderInjector();

    jest.advanceTimersByTime(2000);

    await waitFor(() => expect(consoleError).toHaveBeenCalledWith("ESI down"));
    expect(mockRemoveCharacter).not.toHaveBeenCalled();
    expect(mockAddCharacter).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("swallows unexpected refresh rejections without crashing", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockRefreshCharacterToken.mockRejectedValueOnce(new Error("boom"));
    storeState = {
      addCharacter: mockAddCharacter,
      removeCharacter: mockRemoveCharacter,
      characters: { "1": nearExpiry(1, "RT_BAD") },
    };
    renderInjector();

    jest.advanceTimersByTime(2000);

    expect(mockRefreshCharacterToken).toHaveBeenCalledWith("RT_BAD");
    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(mockAddCharacter).not.toHaveBeenCalled();
    expect(mockRemoveCharacter).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
