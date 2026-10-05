/**
 * Lightweight stub for @jitaspace/hooks used in jest tests.
 *
 * The real package transitively imports @tanstack/db-ivm which ships CJS
 * bundles containing ESM `export` syntax that Next.js's jest transformer
 * refuses to compile.  Mapping this stub via moduleNameMapper ensures the
 * real source is never loaded during tests.
 */

// jest is a global injected by the test runner — use it directly.

export const useFuzzworkRegionalMarketAggregates = (
  jest as (typeof import("@jest/globals"))["jest"]
).fn(() => ({ data: {} }));

export interface FuzzworkTypeMarketAggregate {
  buy: { percentile: number; volume: number };
  sell: { percentile: number; volume: number };
}

// The real list, not a copy: its module imports nothing, so loading it costs
// none of what the rest of the package would.
export { MARKET_HUB_REGION_IDS } from "../../../../packages/hooks/src/hooks/marketHubRegions";
