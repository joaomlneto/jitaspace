import { describe, expect, it } from "@jest/globals";

import {
  getAlliancesAllianceIdContactsInfiniteQueryKey,
  getAlliancesAllianceIdContactsQueryKey,
  getCharactersCharacterIdAssetsInfiniteQueryKey,
  getCharactersCharacterIdAssetsQueryKey,
  getCharactersCharacterIdCalendarInfiniteQueryKey,
  getCharactersCharacterIdCalendarQueryKey,
  getCharactersCharacterIdContactsInfiniteQueryKey,
  getCharactersCharacterIdContactsQueryKey,
  getCharactersCharacterIdMailInfiniteQueryKey,
  getCharactersCharacterIdMailQueryKey,
  getCorporationsCorporationIdAssetsInfiniteQueryKey,
  getCorporationsCorporationIdAssetsQueryKey,
  getCorporationsCorporationIdContactsInfiniteQueryKey,
  getCorporationsCorporationIdContactsQueryKey,
} from "@jitaspace/esi-client";

import {
  esiInfiniteQueryKey,
  INFINITE_QUERY_KEY_MARKER,
} from "../src/hooks/utils/esiInfiniteQueryKey";

// Asserted against the real generated key functions, because the whole point is
// the relationship between the infinite keys and the single-page ones.

const SUBJECT_ID = 1000;

/** Every endpoint this package queries with an infinite query. */
const ENDPOINTS = [
  {
    name: "character assets",
    flat: getCharactersCharacterIdAssetsQueryKey,
    infinite: getCharactersCharacterIdAssetsInfiniteQueryKey,
  },
  {
    name: "corporation assets",
    flat: getCorporationsCorporationIdAssetsQueryKey,
    infinite: getCorporationsCorporationIdAssetsInfiniteQueryKey,
  },
  {
    name: "character contacts",
    flat: getCharactersCharacterIdContactsQueryKey,
    infinite: getCharactersCharacterIdContactsInfiniteQueryKey,
  },
  {
    name: "corporation contacts",
    flat: getCorporationsCorporationIdContactsQueryKey,
    infinite: getCorporationsCorporationIdContactsInfiniteQueryKey,
  },
  {
    name: "alliance contacts",
    flat: getAlliancesAllianceIdContactsQueryKey,
    infinite: getAlliancesAllianceIdContactsInfiniteQueryKey,
  },
  {
    name: "character calendar",
    flat: getCharactersCharacterIdCalendarQueryKey,
    infinite: getCharactersCharacterIdCalendarInfiniteQueryKey,
  },
  {
    name: "character mail",
    flat: getCharactersCharacterIdMailQueryKey,
    infinite: getCharactersCharacterIdMailInfiniteQueryKey,
  },
] as const;

describe("esiInfiniteQueryKey", () => {
  it("appends the marker", () => {
    expect(esiInfiniteQueryKey(["a", "b"])).toEqual([
      "a",
      "b",
      INFINITE_QUERY_KEY_MARKER,
    ]);
  });

  it("keeps distinct inputs distinct", () => {
    expect(esiInfiniteQueryKey(["a"])).not.toEqual(esiInfiniteQueryKey(["b"]));
  });
});

describe("generated infinite keys collide without the marker", () => {
  // This is the hazard the marker exists for: kubb emits the two key functions
  // identically, so with no query params they are already equal. If this ever
  // starts failing, kubb has begun distinguishing them and the marker could be
  // reconsidered — but until then, nothing else separates the entries.
  it.each(ENDPOINTS)("$name", ({ flat, infinite }) => {
    expect(infinite(SUBJECT_ID)).toEqual(flat(SUBJECT_ID));
  });
});

describe("marked infinite keys never collide with the single-page entry", () => {
  it.each(ENDPOINTS)("$name", ({ flat, infinite }) => {
    const marked = esiInfiniteQueryKey(infinite(SUBJECT_ID));

    // One entry holds InfiniteData, the other a flat ResponseConfig. Sharing a
    // key means whichever mounts first wins and the other reads the wrong
    // shape — `data?.pages.flat()` throws, since the optional chain guards
    // `data`, not `pages`.
    expect(marked).not.toEqual(flat(SUBJECT_ID));
    // Also distinct from the params-carrying variant the call sites used to
    // rely on for separation.
    expect(marked).not.toEqual(flat(SUBJECT_ID, {}));
    expect(marked).not.toEqual(infinite(SUBJECT_ID, {}));
  });

  it("still separates two subjects of the same endpoint", () => {
    expect(
      esiInfiniteQueryKey(
        getCorporationsCorporationIdAssetsInfiniteQueryKey(1),
      ),
    ).not.toEqual(
      esiInfiniteQueryKey(
        getCorporationsCorporationIdAssetsInfiniteQueryKey(2),
      ),
    );
  });
});
