"use client";

import { useMemo } from "react";

import {
  useCharacterAssets,
  useCharacterLoyaltyPoints,
  useCharacterWalletBalance,
  useSelectedCharacter,
} from "@jitaspace/hooks";

import { sumOwnedQuantities } from "./purchasability";

/** One piece of the selected character's data, as a filter sees it. */
export type ResourceState<T> =
  /** No selected character, or one that has not granted this scope. */
  | { status: "unavailable"; hint: string }
  /** Available, but not requested: nothing needs it yet. */
  | { status: "idle" }
  | { status: "loading" }
  /** The first request failed; a failed *re*fetch keeps the last value. */
  | { status: "error"; hint: string }
  | { status: "ready"; value: T };

function resourceState<T>({
  hasToken,
  enabled,
  scope,
  value,
  failed,
}: {
  hasToken: boolean;
  enabled: boolean;
  scope: string;
  value: T | undefined;
  failed: boolean;
}): ResourceState<T> {
  if (!hasToken) {
    return {
      status: "unavailable",
      hint: `Sign in with a character that has granted access to its ${scope}`,
    };
  }
  if (value !== undefined) return { status: "ready", value };
  if (!enabled) return { status: "idle" };
  if (failed) return { status: "error", hint: `Couldn't load your ${scope}` };
  return { status: "loading" };
}

/**
 * The selected character's id, or 0 for none. Never `undefined`: given no
 * character id, `useAccessToken` matches *any* signed-in character with the
 * scope, while the query keyed on the missing id stays disabled — a token with
 * nothing behind it.
 */
function useSelectedCharacterId(): number {
  return useSelectedCharacter()?.characterId ?? 0;
}

/** LP per corporation id. Fetched only while `enabled`. */
export function useLoyaltyPointsResource(
  enabled: boolean,
): ResourceState<Readonly<Record<number, number>>> {
  const lp = useCharacterLoyaltyPoints(useSelectedCharacterId(), { enabled });
  return useMemo(
    () =>
      resourceState({
        hasToken: lp.hasToken,
        enabled,
        scope: "loyalty points",
        value: lp.data === undefined ? undefined : lp.loyaltyPointsMap,
        failed: !lp.isLoading,
      }),
    [lp.hasToken, enabled, lp.data, lp.loyaltyPointsMap, lp.isLoading],
  );
}

/** Wallet balance, in ISK. Fetched only while `enabled`. */
export function useIskResource(enabled: boolean): ResourceState<number> {
  const wallet = useCharacterWalletBalance(useSelectedCharacterId(), {
    enabled,
  });
  const isk = wallet.data?.data;
  return useMemo(
    () =>
      resourceState({
        hasToken: wallet.isAllowed,
        enabled,
        scope: "wallet",
        value: isk,
        failed: !wallet.isLoading,
      }),
    [wallet.isAllowed, enabled, isk, wallet.isLoading],
  );
}

/**
 * Units owned per type id, summed across every asset location. The asset walk
 * fetches every page, so it runs only while `enabled`.
 */
export function useOwnedItemsResource(
  enabled: boolean,
): ResourceState<ReadonlyMap<number, number>> {
  const assets = useCharacterAssets(useSelectedCharacterId(), { enabled });
  // Known once every page is in: a page that fails mid-walk leaves
  // `hasNextPage` set, while a failed *re*fetch keeps the last full walk.
  const complete = assets.hasData && !assets.isLoading && !assets.hasNextPage;
  const ownedQuantities = useMemo(
    () =>
      complete ? sumOwnedQuantities(Object.values(assets.assets)) : undefined,
    [complete, assets.assets],
  );
  return useMemo(
    () =>
      resourceState({
        hasToken: assets.hasToken,
        enabled,
        scope: "assets",
        value: ownedQuantities,
        failed: !!assets.error,
      }),
    [assets.hasToken, enabled, ownedQuantities, assets.error],
  );
}
