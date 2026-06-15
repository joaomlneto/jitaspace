/**
 * Lightweight stub for @jitaspace/hooks used in jest tests.
 *
 * The real package transitively imports @tanstack/db-ivm which ships CJS
 * bundles containing ESM `export` syntax that Next.js's jest transformer
 * refuses to compile.  Mapping this stub via moduleNameMapper ensures the
 * real source is never loaded during tests.
 */

// jest is a global injected by the test runner — use it directly.
// eslint-disable-next-line no-undef
export const useFuzzworkRegionalMarketAggregates = (
  jest as typeof import("@jest/globals")["jest"]
).fn(() => ({ data: {} as Record<number, unknown> }));

export type FuzzworkTypeMarketAggregate = {
  buy: { percentile: number; volume: number };
  sell: { percentile: number; volume: number };
};

// Minimal stand-in for the Zustand auth store. MyQueryClientProvider only uses
// `subscribe` (to clear the query cache on logout); the unsubscribe is a no-op.
export const useAuthStore = Object.assign(
  () => ({ characters: {}, selectedCharacter: null }),
  {
    subscribe: (_listener: unknown) => () => undefined,
    getState: () => ({ characters: {}, selectedCharacter: null }),
  },
);
