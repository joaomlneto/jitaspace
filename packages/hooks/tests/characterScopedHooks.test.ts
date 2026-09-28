import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react";

// useCharacterLocation and useEsiCharacterNotifications are thin wrappers:
// ask for a token with the endpoint's scope for THIS character, sign the
// request with it, and stay disabled until there is one. These tests pin that
// contract — a wrong scope or a missing gate would send a request that can
// only 403, against an API that rate-limits on errors.
//
// @swc/jest does not hoist jest.mock above imports, so the hooks are required
// lazily below.
const mockUseAccessToken = jest.fn();
const mockLocation = jest.fn();
const mockNotifications = jest.fn();

jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  useGetCharactersCharacterIdLocation: (...args: unknown[]) =>
    mockLocation(...args),
  useGetCharactersCharacterIdNotifications: (...args: unknown[]) =>
    mockNotifications(...args),
}));

jest.mock("../src/hooks/auth", () => ({
  __esModule: true,
  useAccessToken: (...args: unknown[]) => mockUseAccessToken(...args),
}));

const { useCharacterLocation } =
  require("../src/hooks/location/useCharacterLocation") as typeof import("../src/hooks/location/useCharacterLocation");
const { useEsiCharacterNotifications } =
  require("../src/hooks/character/useEsiCharacterNotifications") as typeof import("../src/hooks/character/useEsiCharacterNotifications");

const CHARACTER_ID = 90000001;
const HEADERS = { Authorization: "Bearer token" };
const withToken = { accessToken: "token", authHeaders: HEADERS };
const withoutToken = { accessToken: null, authHeaders: {} };

/** The `enabled` flag the hook passed to the generated query. */
const enabledFrom = (mock: jest.Mock) =>
  (mock.mock.calls.at(-1)?.[2] as { query: { enabled: boolean } }).query
    .enabled;

beforeEach(() => {
  mockUseAccessToken.mockReset();
  mockLocation.mockReset();
  mockNotifications.mockReset();
});

describe("useCharacterLocation", () => {
  it("asks for this character's location scope and signs with its token", () => {
    mockUseAccessToken.mockReturnValue(withToken);

    renderHook(() => useCharacterLocation(CHARACTER_ID));

    expect(mockUseAccessToken).toHaveBeenCalledWith({
      characterId: CHARACTER_ID,
      scopes: ["esi-location.read_location.v1"],
    });
    expect(mockLocation).toHaveBeenCalledWith(
      CHARACTER_ID,
      HEADERS,
      expect.anything(),
    );
    expect(enabledFrom(mockLocation)).toBe(true);
  });

  it("stays disabled without a token", () => {
    mockUseAccessToken.mockReturnValue(withoutToken);

    renderHook(() => useCharacterLocation(CHARACTER_ID));

    expect(enabledFrom(mockLocation)).toBe(false);
  });
});

describe("useEsiCharacterNotifications", () => {
  it("asks for this character's notifications scope and signs with its token", () => {
    mockUseAccessToken.mockReturnValue(withToken);

    renderHook(() => useEsiCharacterNotifications(CHARACTER_ID));

    expect(mockUseAccessToken).toHaveBeenCalledWith({
      characterId: CHARACTER_ID,
      scopes: ["esi-characters.read_notifications.v1"],
    });
    expect(mockNotifications).toHaveBeenCalledWith(
      CHARACTER_ID,
      HEADERS,
      expect.anything(),
    );
    expect(enabledFrom(mockNotifications)).toBe(true);
  });

  it("stays disabled without a token", () => {
    mockUseAccessToken.mockReturnValue(withoutToken);

    renderHook(() => useEsiCharacterNotifications(CHARACTER_ID));

    expect(enabledFrom(mockNotifications)).toBe(false);
  });

  it("stays disabled without a character, rather than querying character 0", () => {
    mockUseAccessToken.mockReturnValue(withToken);

    renderHook(() => useEsiCharacterNotifications(undefined));

    expect(mockNotifications.mock.calls.at(-1)?.[0]).toBe(0);
    expect(enabledFrom(mockNotifications)).toBe(false);
  });
});
