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

/** Mirrors the real list in `src/hooks/useTypeMarketOrders.ts`. */
export const MARKET_HUB_REGION_IDS = [
  10000002, 10000043, 10000032, 10000030, 10000042,
];
