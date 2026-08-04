import { describe, expect, it } from "@jest/globals";

import {
  getCharactersCharacterIdFittingsQueryKey,
  getCharactersCharacterIdFittingsQueryOptions,
  getCorporationsCorporationIdAssetsQueryKey,
} from "@jitaspace/esi-client";

import {
  ALL_PAGES_QUERY_KEY_MARKER,
  esiPagedQueryOptions,
} from "../src/hooks/multi/esiPagedQueryOptions";

// These assert against the REAL generated key functions rather than mocks,
// because the thing worth pinning is the relationship between the multi-subject
// keys and the single-subject ones — which a mock cannot tell you anything
// about.

describe("non-paginated multi queries share the single-subject cache entry", () => {
  it("passes the generated query key through untouched", () => {
    // Typed as a Record, matching what useEsiSubjects hands the query builder:
    // the generated header params type does not declare Authorization, so an
    // object literal would trip the excess-property check.
    const authHeaders: Record<string, string> = {
      Authorization: "Bearer token-100",
    };
    const options = getCharactersCharacterIdFittingsQueryOptions(
      100,
      authHeaders,
    );

    // defineMultiEsiQuery spreads these options and only adds `select`, so the
    // key it registers is this one — the same entry useCharacterFittings uses.
    expect(options.queryKey).toEqual(
      getCharactersCharacterIdFittingsQueryKey(100),
    );
  });

  it("keys differ per subject", () => {
    expect(getCharactersCharacterIdFittingsQueryKey(100)).not.toEqual(
      getCharactersCharacterIdFittingsQueryKey(101),
    );
  });
});

describe("paginated multi queries do NOT collide with the single-page entry", () => {
  const generatedKey = getCorporationsCorporationIdAssetsQueryKey(1000);

  const pagedKey = esiPagedQueryOptions({
    queryKey: generatedKey,
    fetchPage: () => Promise.resolve({ data: [], headers: {} } as never),
  }).queryKey;

  it("does not reuse the generated single-page key", () => {
    // Both hold ResponseConfig<T[]>, so sharing this key would be silent wrong
    // data — all pages served to a caller that asked for page 1, or vice versa.
    expect(pagedKey).not.toEqual(generatedKey);
  });

  it("extends the generated key with the all-pages marker", () => {
    expect(pagedKey).toEqual([...generatedKey, ALL_PAGES_QUERY_KEY_MARKER]);
  });

  it("still varies per subject", () => {
    const otherKey = esiPagedQueryOptions({
      queryKey: getCorporationsCorporationIdAssetsQueryKey(2000),
      fetchPage: () => Promise.resolve({ data: [], headers: {} } as never),
    }).queryKey;

    expect(pagedKey).not.toEqual(otherKey);
  });
});
