import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";

// ESI serves localised names — type, region, solar system and faction names all
// come back in whatever `Accept-Language` asked for — but the name cache in
// useEsiName is a module-level LRU keyed by entity id alone. Switching language
// therefore used to leave every already-resolved name rendered in the old
// language for the rest of the session: the key never moved, the entry stayed
// `success`, and no request was ever issued. These tests pin the fix: the cache
// key is now scoped by language, so a switch resolves afresh and a switch back
// reuses what was already fetched.
//
// Test isolation: the LRU lives at module scope and is shared by every test in
// this file. Rather than jest.resetModules() + re-require (which would rebuild
// the mocked-hook wiring on every test), each test uses its own entity id — the
// cheaper lever, and the one that lets a test observe entries left behind by its
// own earlier renders, which is exactly what "switching back reuses the cached
// entry" needs to assert.
//
// @swc/jest does not hoist jest.mock above imports, so the client is mocked here
// and the hooks under test are required lazily below.

// The jsdom environment resolves @react-hook/cache through its "browser"
// export condition, which is an untransformed ESM build. Redirect both it and
// its own dependency to the package's CommonJS build so the REAL LRU cache runs
// here — stubbing it out would erase the very behaviour under test.
jest.mock("@react-hook/cache", () =>
  require("@react-hook/cache/dist/main/index.js"),
);
jest.mock("@react-hook/latest", () =>
  require("@react-hook/latest/dist/main/index.js"),
);

/** Drives both the mocked language hook and the language the fake ESI answers in. */
let currentLanguage: string | undefined = "en";

/** Listeners registered through the mocked `subscribeToAcceptLanguage`. */
const acceptLanguageListeners = new Set<() => void>();

const mockUseEsiAcceptLanguage = jest.fn();
const mockGetUniverseTypesTypeId = jest.fn();

jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  getUniverseTypesTypeId: (...args: unknown[]) =>
    mockGetUniverseTypesTypeId(...args),
  // Consumed by the real useEsiAcceptLanguage in the last describe block.
  getAcceptLanguage: () => currentLanguage,
  subscribeToAcceptLanguage: (listener: () => void) => {
    acceptLanguageListeners.add(listener);
    return () => acceptLanguageListeners.delete(listener);
  },
}));

// Every id below is passed with an explicit category, so the id-range inference
// never runs; the ranges are stubbed only so the import resolves.
jest.mock("@jitaspace/esi-metadata", () => ({
  __esModule: true,
  isIdInRanges: () => false,
  allianceIdRanges: [],
  characterIdRanges: [],
  corporationIdRanges: [],
  stargateRanges: [],
  stationRanges: [],
}));

jest.mock("../src/hooks/useEsiAcceptLanguage", () => ({
  __esModule: true,
  useEsiAcceptLanguage: () => mockUseEsiAcceptLanguage(),
}));

const {
  useEsiName,
  useEsiNameLookup,
  useEsiNamePrefetch,
  useEsiNames,
  useEsiNamesCache,
} =
  require("../src/hooks/useEsiName") as typeof import("../src/hooks/useEsiName");

/** The real hook, over the mocked esi-client store above. */
const { useEsiAcceptLanguage } = jest.requireActual<
  typeof import("../src/hooks/useEsiAcceptLanguage")
>("../src/hooks/useEsiAcceptLanguage");

/** What the fake ESI answers with, for whatever language is configured now. */
const localisedName = () => `Rifter [${currentLanguage ?? "none"}]`;

beforeEach(() => {
  currentLanguage = "en";
  acceptLanguageListeners.clear();

  mockUseEsiAcceptLanguage.mockReset();
  mockUseEsiAcceptLanguage.mockImplementation(() => currentLanguage);

  mockGetUniverseTypesTypeId.mockReset();
  mockGetUniverseTypesTypeId.mockImplementation(() =>
    Promise.resolve({ data: { name: localisedName() } }),
  );
});

/** Flip the configured language and re-render whatever `rerender` belongs to. */
function switchLanguageTo(language: string, rerender: () => void) {
  currentLanguage = language;
  act(() => {
    rerender();
  });
}

describe("useEsiName under a language switch", () => {
  it("re-resolves the name when the language changes instead of serving the previous language's string", async () => {
    const { result, rerender } = renderHook(() =>
      useEsiName(601, "inventory_type"),
    );

    await waitFor(() => expect(result.current.name).toBe("Rifter [en]"));
    expect(mockGetUniverseTypesTypeId).toHaveBeenCalledTimes(1);

    switchLanguageTo("de", rerender);

    // Before the fix this stayed "Rifter [en]" forever and no second request
    // was ever issued — the half-translated UI the fix is about.
    await waitFor(() => expect(result.current.name).toBe("Rifter [de]"));
    expect(mockGetUniverseTypesTypeId).toHaveBeenCalledTimes(2);
    expect(mockGetUniverseTypesTypeId).toHaveBeenNthCalledWith(2, 601, {}, {});
  });

  it("reuses the already-cached entry when switching back to the first language", async () => {
    const { result, rerender } = renderHook(() =>
      useEsiName(602, "inventory_type"),
    );

    await waitFor(() => expect(result.current.name).toBe("Rifter [en]"));

    switchLanguageTo("de", rerender);
    await waitFor(() => expect(result.current.name).toBe("Rifter [de]"));
    expect(mockGetUniverseTypesTypeId).toHaveBeenCalledTimes(2);

    switchLanguageTo("en", rerender);

    // The payoff of keying rather than clearing: the English entry is still
    // there, so the name is available on the very next render with no loading
    // flicker and no third request.
    expect(result.current.name).toBe("Rifter [en]");
    expect(result.current.loading).toBe(false);
    expect(mockGetUniverseTypesTypeId).toHaveBeenCalledTimes(2);
  });

  it("holds independent entries for the same id under two languages at once", async () => {
    const english = renderHook(() => useEsiName(603, "inventory_type"));
    await waitFor(() =>
      expect(english.result.current.name).toBe("Rifter [en]"),
    );

    currentLanguage = "de";
    const german = renderHook(() => useEsiName(603, "inventory_type"));
    await waitFor(() => expect(german.result.current.name).toBe("Rifter [de]"));

    // Both entries coexist in the LRU, keyed apart by language. Before the fix
    // the German render read the English entry straight back out and returned
    // "Rifter [en]", leaving exactly one entry for this id.
    const { result: cache } = renderHook(() => useEsiNamesCache());
    const namesForThisId = Object.entries(cache.current)
      .filter(([key]) => key.includes("603"))
      .map(([, entry]) => entry.value?.name);

    expect(namesForThisId.sort()).toEqual(["Rifter [de]", "Rifter [en]"]);
  });
});

describe("useEsiName id normalisation", () => {
  it("accepts a string id and resolves it under the current language", async () => {
    // Callers reach useEsiName through EveEntityAnchor/EveEntityAvatar, which
    // hand it whatever the DOM gave them — often a string.
    currentLanguage = "en";

    const { result } = renderHook(() => useEsiName("607", "inventory_type"));

    await waitFor(() => expect(result.current.name).toBe("Rifter [en]"));
    // The resolver coerces to a number before it reaches ESI.
    expect(mockGetUniverseTypesTypeId).toHaveBeenCalledWith(607, {}, {});
  });

  it("stays idle for an undefined id instead of resolving one", async () => {
    // EveEntityName renders with `entityId ?? undefined`, so this is the
    // ordinary "nothing selected yet" render, not an error path.
    currentLanguage = "en";

    const { result } = renderHook(() => useEsiName(undefined));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.name).toBeUndefined();
    expect(mockGetUniverseTypesTypeId).not.toHaveBeenCalled();
  });
});

describe("useEsiNames / useEsiNameLookup public key shape", () => {
  // Stable reference: `useEsiNames` memoises on it, and a fresh array each
  // render would re-run the subscription effect for reasons unrelated to
  // language.
  const LOOKUP_ENTRIES = [{ id: 604, category: "inventory_type" as const }];

  it("keys its record by the plain entity id, and refreshes that entry when the language changes", async () => {
    const { result, rerender } = renderHook(() =>
      useEsiNameLookup(LOOKUP_ENTRIES),
    );

    // apps/web/app/assets/character/page.tsx and EveEntitySelect.tsx both index
    // this record as `names[id.toString()]`. If the language-scoped cache key
    // leaked into the public shape, those pages would render blank labels.
    await waitFor(() =>
      expect(result.current["604"]?.value?.name).toBe("Rifter [en]"),
    );
    expect(Object.keys(result.current)).toEqual(["604"]);

    switchLanguageTo("de", rerender);

    await waitFor(() =>
      expect(result.current["604"]?.value?.name).toBe("Rifter [de]"),
    );
    expect(Object.keys(result.current)).toEqual(["604"]);
  });

  it("never exposes a language-scoped key, even before anything has resolved", () => {
    const entries = [{ id: 605, category: "inventory_type" as const }];
    currentLanguage = "fr";

    const { result } = renderHook(() => useEsiNames(entries));

    expect(Object.keys(result.current)).toEqual(["605"]);
    Object.keys(result.current).forEach((key) => {
      expect(key).not.toContain("\u0000");
      expect(key).not.toContain("fr");
    });
  });
});

describe("useEsiNamePrefetch under a language switch", () => {
  const PREFETCH_ENTRIES = [{ id: 606, category: "inventory_type" as const }];

  it("loads under the current language and loads again when the language changes", async () => {
    const { rerender } = renderHook(() => useEsiNamePrefetch(PREFETCH_ENTRIES));

    await waitFor(() =>
      expect(mockGetUniverseTypesTypeId).toHaveBeenCalledTimes(1),
    );

    // The entries array is referentially stable, so before the fix the effect's
    // `[entries]` deps never changed and the prefetch simply never ran again.
    switchLanguageTo("de", rerender);

    await waitFor(() =>
      expect(mockGetUniverseTypesTypeId).toHaveBeenCalledTimes(2),
    );

    const { result: cache } = renderHook(() => useEsiNamesCache());
    const namesForThisId = Object.entries(cache.current)
      .filter(([key]) => key.includes("606"))
      .map(([, entry]) => entry.value?.name);

    expect(namesForThisId.sort()).toEqual(["Rifter [de]", "Rifter [en]"]);
  });
});

describe("useEsiAcceptLanguage", () => {
  function LanguageProbe() {
    return <span>{useEsiAcceptLanguage() ?? "(unset)"}</span>;
  }

  it("renders the configured language on the server, so the hydration render matches", () => {
    // The server snapshot deliberately reads the same module-level config the
    // browser does. apps/web seeds it at module scope (MyQueryClientProvider),
    // so both passes agree and the cache key does not move at hydration.
    // Returning a hardcoded "unset" here instead would make every name resolve
    // once under no language and again the moment the real one landed — one
    // wasted ESI request per entity on every cold load.
    currentLanguage = "de";

    expect(renderToString(<LanguageProbe />)).toContain("de");
  });

  it("renders as unset on the server when nothing has configured a language", () => {
    // An app that never seeds still gets a server render matching its first
    // client render; it just pays for the transition later.
    currentLanguage = undefined;

    expect(renderToString(<LanguageProbe />)).toContain("(unset)");
  });

  it("re-renders with the new value when subscribeToAcceptLanguage fires", () => {
    currentLanguage = "en";

    const { result } = renderHook(() => useEsiAcceptLanguage());
    expect(result.current).toBe("en");

    act(() => {
      currentLanguage = "de";
      acceptLanguageListeners.forEach((listener) => listener());
    });

    expect(result.current).toBe("de");
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useEsiAcceptLanguage());
    expect(acceptLanguageListeners.size).toBe(1);

    unmount();

    expect(acceptLanguageListeners.size).toBe(0);
  });
});
