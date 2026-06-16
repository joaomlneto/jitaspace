import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// EsiRateLimitDashboard pulls live rate-limit state + several config helpers
// from the generated esi-client, the auth store from @jitaspace/hooks, and a
// CharacterAvatar from @jitaspace/ui. It also lazy-loads a Sparkline via
// next/dynamic. Mock all of these so the empty + populated branches render in
// jsdom without real network/runtime state.
const mockUseEsiRateLimit = jest.fn();
const mockUseAuthStore = jest.fn();
const mockGetAllRateLimitGroups = jest.fn();
const mockGetRateLimitBucketConfigs = jest.fn();
const mockGetRateLimitBuildDate = jest.fn();
const mockGetRateLimitRequestHistoryWindowSeconds = jest.fn();
const mockGetWaitTime = jest.fn();

jest.mock("@jitaspace/esi-client", () => ({
  DEFAULT_RATE_LIMIT_USER_ID: "anonymous",
  useEsiRateLimit: () => mockUseEsiRateLimit(),
  getAllRateLimitGroups: () => mockGetAllRateLimitGroups(),
  getRateLimitBucketConfigs: () => mockGetRateLimitBucketConfigs(),
  getRateLimitBuildDate: () => mockGetRateLimitBuildDate(),
  getRateLimitRequestHistoryWindowSeconds: () =>
    mockGetRateLimitRequestHistoryWindowSeconds(),
  getWaitTime: (...args: unknown[]) => mockGetWaitTime(...args),
}));

jest.mock("@jitaspace/hooks", () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

// CharacterAvatar pulls in image/network deps; render a marker instead.
jest.mock("@jitaspace/ui", () => ({
  CharacterAvatar: ({ characterId }: { characterId: number }) => (
    <span data-testid="character-avatar">avatar-{characterId}</span>
  ),
}));

// next/dynamic would async-import @mantine/charts; replace the Sparkline with a
// trivial component so rows render synchronously.
jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => () => <span data-testid="sparkline" />,
}));

function renderDashboard() {
  const {
    EsiRateLimitDashboard,
  } = require("~/components/Status/EsiRateLimitDashboard");
  return render(
    <MantineProvider>
      <EsiRateLimitDashboard />
    </MantineProvider>,
  );
}

describe("EsiRateLimitDashboard", () => {
  beforeEach(() => {
    mockUseEsiRateLimit.mockReset();
    mockUseAuthStore.mockReset();
    mockGetAllRateLimitGroups.mockReset();
    mockGetRateLimitBucketConfigs.mockReset();
    mockGetRateLimitBuildDate.mockReset();
    mockGetRateLimitRequestHistoryWindowSeconds.mockReset();
    mockGetWaitTime.mockReset();

    // sensible defaults; individual tests override as needed
    mockUseAuthStore.mockReturnValue({ characters: {} });
    mockGetRateLimitBuildDate.mockReturnValue("2025-12-16");
    mockGetRateLimitRequestHistoryWindowSeconds.mockReturnValue(300);
    mockGetWaitTime.mockReturnValue(0);
    mockGetAllRateLimitGroups.mockReturnValue([]);
    mockGetRateLimitBucketConfigs.mockReturnValue({});
  });

  it("shows the empty-state alert when no buckets or configs exist", () => {
    mockUseEsiRateLimit.mockReturnValue({});
    renderDashboard();

    expect(screen.getByText("ESI Rate Limits")).toBeInTheDocument();
    expect(
      screen.getByText(/No ESI rate-limit buckets discovered yet/i),
    ).toBeInTheDocument();
  });

  it("renders the summary cards, a live bucket row, and a placeholder bucket", () => {
    const now = Date.now();

    // One live bucket for an authenticated character that is heavily consumed
    // (remaining 1 of 100 -> Critical status + nearest reset in the future).
    mockUseEsiRateLimit.mockReturnValue({
      "market::character:90000001": {
        bucketKey: "market::character:90000001",
        group: "market",
        userId: "character:90000001",
        limit: 100,
        remaining: 1,
        windowSeconds: 60,
        retryAfterUntil: 0,
        consumedTokens: [{ timestamp: now, tokens: 99 }],
        requestHistory: [
          {
            timestamp: now,
            date: new Date(now).toISOString(),
            endpoint: "/markets/prices/",
            params: {},
            statusCode: 200,
            tokenCost: 5,
          },
        ],
      },
    });

    // Resolve the character name from the auth store.
    mockUseAuthStore.mockReturnValue({
      characters: {
        90000001: {
          characterId: 90000001,
          accessTokenPayload: { name: "Test Pilot" },
        },
      },
    });

    // A second group that has config but no live state -> placeholder bucket.
    mockGetAllRateLimitGroups.mockReturnValue(["market", "assets"]);
    mockGetRateLimitBucketConfigs.mockReturnValue({
      market: {
        group: "market",
        maxTokens: 100,
        windowSize: "60s",
        windowSeconds: 60,
        routeCount: 3,
        routeMatchers: ["GET /markets/prices/", "GET /markets/{id}/orders/"],
      },
      assets: {
        group: "assets",
        maxTokens: 40,
        windowSize: "1h",
        windowSeconds: 3600,
        routeCount: 2,
        routeMatchers: ["GET /characters/{id}/assets/"],
      },
    });
    mockGetWaitTime.mockReturnValue(2500);

    renderDashboard();

    // Header + compatibility date
    expect(screen.getByText("ESI Rate Limits")).toBeInTheDocument();
    expect(
      screen.getByText(/Compatibility date: 2025-12-16/),
    ).toBeInTheDocument();

    // Summary card labels
    expect(screen.getByText("Buckets")).toBeInTheDocument();
    expect(screen.getByText("Stressed Buckets")).toBeInTheDocument();
    expect(screen.getByText("Nearest Token Reset")).toBeInTheDocument();

    // Live bucket: group name, resolved character name + avatar, Critical status
    expect(screen.getByText("market")).toBeInTheDocument();
    expect(screen.getByText("Test Pilot")).toBeInTheDocument();
    expect(screen.getByTestId("character-avatar")).toBeInTheDocument();
    expect(screen.getByText("Critical")).toBeInTheDocument();

    // Placeholder bucket for the "assets" group is rendered too.
    expect(screen.getByText("assets")).toBeInTheDocument();
    // Placeholder is full (40/40) -> Healthy status badge present.
    expect(screen.getByText("Healthy")).toBeInTheDocument();

    // Sparkline (mocked) renders per row.
    expect(screen.getAllByTestId("sparkline").length).toBeGreaterThanOrEqual(2);
  });

  it("falls back to a generic character label when the name is unknown", () => {
    mockUseEsiRateLimit.mockReturnValue({
      "market::character:42": {
        bucketKey: "market::character:42",
        group: "market",
        userId: "character:42",
        limit: 100,
        remaining: 100,
        windowSeconds: 60,
        retryAfterUntil: 0,
        consumedTokens: [],
        requestHistory: [],
      },
    });
    // auth store has no matching character -> "Character 42" fallback
    mockUseAuthStore.mockReturnValue({ characters: {} });

    renderDashboard();

    expect(screen.getByText("Character 42")).toBeInTheDocument();
    // remaining == limit -> Healthy
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });
});
