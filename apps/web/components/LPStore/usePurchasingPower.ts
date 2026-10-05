"use client";

import { useMemo } from "react";

import {
  useCharacterAssets,
  useCharacterLoyaltyPoints,
  useCharacterWalletBalance,
  useSelectedCharacter,
} from "@jitaspace/hooks";

import { sumOwnedQuantities } from "./purchasability";

export type ResourceState<T> =
  /** No selected character, or one that has not granted this scope. */
  | { status: "unavailable"; hint: string }
  | { status: "loading" }
  /** The first request failed; a failed *re*fetch keeps the last value. */
  | { status: "error"; hint: string }
  | { status: "ready"; value: T };

export interface PurchasingPower {
  /** LP per corporation id. */
  loyaltyPoints: ResourceState<Readonly<Record<number, number>>>;
  /** Wallet balance, in ISK. */
  isk: ResourceState<number>;
  /** Units owned per type id, summed across every asset location. */
  ownedQuantities: ResourceState<ReadonlyMap<number, number>>;
}

function resourceState<T>(
  hasToken: boolean,
  scope: string,
  value: T | undefined,
  failed: boolean,
): ResourceState<T> {
  if (!hasToken) {
    return {
      status: "unavailable",
      hint: `Sign in with a character that has granted access to its ${scope}`,
    };
  }
  if (value !== undefined) return { status: "ready", value };
  if (failed) return { status: "error", hint: `Couldn't load your ${scope}` };
  return { status: "loading" };
}

/**
 * The selected character's LP, wallet balance and owned items, each with its
 * own state: each needs its own ESI scope and loads on its own, so one missing
 * or failing never holds back the others.
 */
export function usePurchasingPower(): PurchasingPower {
  const characterId = useSelectedCharacter()?.characterId;
  const lp = useCharacterLoyaltyPoints(characterId ?? 0);
  const wallet = useCharacterWalletBalance(characterId);
  const assets = useCharacterAssets(characterId);

  // Assets arrive page by page: they are known only once no page is
  // outstanding, and a page that fails leaves `hasNextPage` set.
  const assetsComplete =
    !assets.isLoading && !assets.hasNextPage && !assets.error;
  const ownedQuantities = useMemo(
    () =>
      assetsComplete
        ? sumOwnedQuantities(Object.values(assets.assets))
        : undefined,
    [assetsComplete, assets.assets],
  );
  const isk = wallet.data?.data;

  const loyaltyPoints = useMemo(
    () =>
      resourceState(
        lp.hasToken,
        "loyalty points",
        lp.data === undefined ? undefined : lp.loyaltyPointsMap,
        !lp.isLoading,
      ),
    [lp.hasToken, lp.data, lp.loyaltyPointsMap, lp.isLoading],
  );
  const iskState = useMemo(
    () => resourceState(wallet.isAllowed, "wallet", isk, !wallet.isLoading),
    [wallet.isAllowed, isk, wallet.isLoading],
  );
  const owned = useMemo(
    () =>
      resourceState(assets.hasToken, "assets", ownedQuantities, !!assets.error),
    [assets.hasToken, ownedQuantities, assets.error],
  );

  return useMemo(
    () => ({ loyaltyPoints, isk: iskState, ownedQuantities: owned }),
    [loyaltyPoints, iskState, owned],
  );
}
