"use client";

import { useSyncExternalStore } from "react";

const TICK_MS = 30_000;

let now: number | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (timer === undefined) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((notify) => notify());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function getSnapshot() {
  // With nothing subscribed nothing ticks, so a reading from before a quiet
  // spell (the page left and came back) would be judged by on the first
  // render back. Re-read once it is a tick old; within a render the value
  // stays put, as useSyncExternalStore requires.
  if (now === null || (timer === undefined && Date.now() - now >= TICK_MS)) {
    now = Date.now();
  }
  return now;
}

const getServerSnapshot = () => null;

/**
 * The current time, refreshed every 30 seconds, or null while the page is
 * prerendered and hydrating.
 *
 * Null on the server on purpose: a client component reading `Date.now()` while
 * a static page prerenders makes its Suspense boundary dynamic, which silently
 * drops the page out of the cached HTML (see apps/web/CLAUDE.md).
 */
export const useNow = (): number | null =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
