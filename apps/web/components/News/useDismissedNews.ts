"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "@mantine/hooks";

import { newsItems, type NewsItem } from "~/config/news";

/** Default localStorage key for dismissed news on the home page. */
export const DEFAULT_NEWS_STORAGE_KEY = "jitaspace/dismissed-news";

export interface UseDismissedNewsOptions {
  /** Override the localStorage key (used to keep preview variants independent). */
  storageKey?: string;
  /** Override the source items (defaults to the shared news config). */
  items?: NewsItem[];
}

export interface UseDismissedNewsResult {
  /** Items that are neither dismissed nor expired. Empty until mounted. */
  activeItems: NewsItem[];
  /** Ids the user has dismissed. */
  dismissedIds: string[];
  /** Whether the component has mounted on the client. */
  mounted: boolean;
  /** Dismiss a single item by id (persisted). */
  dismiss: (id: string) => void;
  /** Restore all dismissed items. */
  reset: () => void;
}

/**
 * Filters out dismissed, not-yet-published and expired items.
 *
 * Reads the wall clock via `Date.now()`, so it must only run on the client
 * (never during render/prerender) — Next.js flags non-deterministic time in
 * Client Components. The hook below only calls this after mount.
 */
function selectActiveItems(
  items: NewsItem[],
  dismissedIds: string[],
): NewsItem[] {
  const now = Date.now();
  return items.filter(
    (item) =>
      !dismissedIds.includes(item.id) &&
      (!item.publishAt || new Date(item.publishAt).getTime() <= now) &&
      (!item.expiresAt || new Date(item.expiresAt).getTime() > now),
  );
}

/**
 * Tracks which news items the user has dismissed, persisted in localStorage,
 * and returns the still-active items (not dismissed, not expired).
 *
 * Rendering is gated on mount so the server output and the first client render
 * always match — this avoids hydration mismatches that would otherwise arise
 * from reading localStorage or the wall clock during render.
 */
export function useDismissedNews(
  options: UseDismissedNewsOptions = {},
): UseDismissedNewsResult {
  const { storageKey = DEFAULT_NEWS_STORAGE_KEY, items = newsItems } = options;

  const [dismissedIds, setDismissedIds] = useLocalStorage<string[]>({
    key: storageKey,
    defaultValue: [],
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dismiss = useCallback(
    (id: string) =>
      setDismissedIds((prev) => (prev.includes(id) ? prev : [...prev, id])),
    [setDismissedIds],
  );

  const reset = useCallback(() => setDismissedIds([]), [setDismissedIds]);

  // `selectActiveItems` reads `Date.now()`, so only call it after mount: doing
  // so during render/prerender trips Next.js's non-deterministic-time check
  // (and would risk a hydration mismatch). Before mount we render nothing.
  const activeItems = mounted ? selectActiveItems(items, dismissedIds) : [];

  return { activeItems, dismissedIds, mounted, dismiss, reset };
}
