/**
 * Regression tests for zustand v5 selector reference stability.
 *
 * In zustand v5, selectors that return new array/object references on every
 * call cause infinite re-render loops ("Maximum update depth exceeded").
 * Selectors that construct arrays/objects must be wrapped with `useShallow`.
 *
 * These tests use a minimal local store to avoid ESM-only transitive
 * dependencies in @jitaspace/hooks, while still covering the exact patterns
 * present in the production hooks:
 *   - useAuthenticatedCharacterIds: Object.keys().map()
 *   - useAccessToken:               Object.values().filter()
 *   - CorporationMenu / AllianceMenu: Object.values().filter().flatMap()
 *   - page.tsx:                     Array.from(new Set(...))
 */

import "@testing-library/jest-dom/jest-globals";

import { describe, it } from "@jest/globals";
import { renderHook } from "@testing-library/react";
import { create } from "zustand";
import { useShallow } from "zustand/shallow";

interface Character {
  characterId: number;
  corporationId: number;
  allianceId?: number;
  scopes: string[];
}

interface StoreState {
  characters: Record<number, Character>;
}

const makeStore = (characters: Record<number, Character>) =>
  create<StoreState>()(() => ({ characters }));

const CHARACTERS: Record<number, Character> = {
  100: {
    characterId: 100,
    corporationId: 1,
    allianceId: 10,
    scopes: ["esi-skills.read_skills.v1"],
  },
  101: {
    characterId: 101,
    corporationId: 1,
    allianceId: 10,
    scopes: ["esi-wallet.read_character_wallet.v1"],
  },
  102: { characterId: 102, corporationId: 2, scopes: [] },
};

describe("useShallow — Object.keys().map() pattern (useAuthenticatedCharacterIds)", () => {
  it("does not cause infinite re-renders", () => {
    const useStore = makeStore(CHARACTERS);
    renderHook(() =>
      useStore(
        useShallow((state) => Object.keys(state.characters).map(Number)),
      ),
    );
  });

  it("returns the correct character ids", () => {
    const useStore = makeStore(CHARACTERS);
    const { result } = renderHook(() =>
      useStore(
        useShallow((state) => Object.keys(state.characters).map(Number)),
      ),
    );
    expect(result.current).toEqual([100, 101, 102]);
  });
});

describe("useShallow — Object.values().filter() pattern (useAccessToken)", () => {
  it("does not cause infinite re-renders", () => {
    const useStore = makeStore(CHARACTERS);
    renderHook(() =>
      useStore(
        useShallow((state) =>
          Object.values(state.characters).filter((c) => c.corporationId === 1),
        ),
      ),
    );
  });

  it("returns only matching characters", () => {
    const useStore = makeStore(CHARACTERS);
    const { result } = renderHook(() =>
      useStore(
        useShallow((state) =>
          Object.values(state.characters).filter((c) => c.corporationId === 1),
        ),
      ),
    );
    expect(result.current.map((c) => c.characterId)).toEqual([100, 101]);
  });
});

describe("useShallow — Object.values().filter().flatMap() pattern (CorporationMenu / AllianceMenu)", () => {
  it("does not cause infinite re-renders", () => {
    const useStore = makeStore(CHARACTERS);
    renderHook(() =>
      useStore(
        useShallow((state) =>
          Array.from(
            new Set(
              Object.values(state.characters)
                .filter((c) => c.corporationId === 1)
                .flatMap((c) => c.scopes),
            ),
          ),
        ),
      ),
    );
  });

  it("returns deduplicated scopes for matching characters", () => {
    const useStore = makeStore(CHARACTERS);
    const { result } = renderHook(() =>
      useStore(
        useShallow((state) =>
          Array.from(
            new Set(
              Object.values(state.characters)
                .filter((c) => c.corporationId === 1)
                .flatMap((c) => c.scopes),
            ),
          ),
        ),
      ),
    );
    expect(result.current).toEqual([
      "esi-skills.read_skills.v1",
      "esi-wallet.read_character_wallet.v1",
    ]);
  });
});

describe("useShallow — Array.from(new Set()) pattern (page.tsx)", () => {
  it("does not cause infinite re-renders for corporation ids", () => {
    const useStore = makeStore(CHARACTERS);
    const characterIds = [100, 101, 102];
    renderHook(() =>
      useStore(
        useShallow((state) =>
          Array.from(
            new Set(
              characterIds
                .map((id) => state.characters[id]?.corporationId)
                .filter((id): id is number => id != null),
            ),
          ),
        ),
      ),
    );
  });

  it("returns deduplicated corporation ids", () => {
    const useStore = makeStore(CHARACTERS);
    const characterIds = [100, 101, 102];
    const { result } = renderHook(() =>
      useStore(
        useShallow((state) =>
          Array.from(
            new Set(
              characterIds
                .map((id) => state.characters[id]?.corporationId)
                .filter((id): id is number => id != null),
            ),
          ),
        ),
      ),
    );
    expect(result.current).toEqual([1, 2]);
  });
});
