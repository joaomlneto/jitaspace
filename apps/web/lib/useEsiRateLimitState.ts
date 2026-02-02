"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import type { RateLimitStateSnapshot } from "@jitaspace/esi-client";
import {
  getRateLimitState,
  subscribeRateLimitState,
} from "@jitaspace/esi-client";

let cachedSnapshot: RateLimitStateSnapshot | null = null;

const getCachedSnapshot = () => {
  if (!cachedSnapshot) {
    cachedSnapshot = getRateLimitState();
  }
  return cachedSnapshot;
};

const refreshSnapshot = () => {
  cachedSnapshot = getRateLimitState();
};

const subscribe = (listener: () => void) =>
  subscribeRateLimitState(() => {
    refreshSnapshot();
    listener();
  });

export const useEsiRateLimitState = (
  options: { refreshMs?: number } = {},
): RateLimitStateSnapshot => {
  const { refreshMs = 1000 } = options;
  const snapshot = useSyncExternalStore(
    subscribe,
    getCachedSnapshot,
    getCachedSnapshot,
  );
  const [, setTick] = useState(0);

  useEffect(() => {
    if (refreshMs <= 0) return;
    const timer = setInterval(() => {
      refreshSnapshot();
      setTick((tick) => tick + 1);
    }, refreshMs);
    return () => clearInterval(timer);
  }, [refreshMs]);

  return snapshot;
};
