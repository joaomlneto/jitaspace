/**
 * Lightweight stub for @jitaspace/hooks used in jest tests.
 *
 * The real package transitively imports @tanstack/db-ivm which ships CJS
 * bundles containing ESM `export` syntax that Next.js's jest transformer
 * refuses to compile.  Mapping this stub via moduleNameMapper ensures the
 * real source is never loaded during tests.
 */

import type { jest as JestGlobal } from "@jest/globals";

// jest is a global injected by the test runner — use it directly.
const jestFn = (jest as typeof JestGlobal).fn;

export const useFuzzworkRegionalMarketAggregates = jestFn(() => ({ data: {} }));

// Signed out by default: the LP store table asks for the selected character's
// LP, wallet and assets. Tests configure these the same way as above.
export const useSelectedCharacter = jestFn(
  (): { characterId: number } | null => null,
);
export const useCharacterLoyaltyPoints = jestFn(
  (_characterId: number): Record<string, unknown> => ({
    hasToken: false,
    loyaltyPointsMap: {},
    isLoading: false,
  }),
);
export const useCharacterWalletBalance = jestFn(
  (_characterId?: number): Record<string, unknown> => ({
    isAllowed: false,
    isLoading: false,
  }),
);
export const useCharacterAssets = jestFn(
  (_characterId?: number): Record<string, unknown> => ({
    hasToken: false,
    assets: {},
    isLoading: false,
    hasNextPage: false,
    hasData: false,
    error: null,
  }),
);

export interface FuzzworkTypeMarketAggregate {
  buy: { percentile: number; volume: number };
  sell: { percentile: number; volume: number };
}

// The real list, not a copy: its module imports nothing, so loading it costs
// none of what the rest of the package would.
export { MARKET_HUB_REGION_IDS } from "../../../../packages/hooks/src/hooks/marketHubRegions";
export { UNIVERSE_NAMES_MAX_ID } from "../../../../packages/hooks/src/hooks/universeNamesLimits";
