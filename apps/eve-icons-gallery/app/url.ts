import { useMemo, useSyncExternalStore } from "react";

/**
 * The query string as a store, so shareable state (search, set filter, open
 * icon) lives in the URL. On the server and during hydration it reads as
 * empty, which lets the static export prerender the unfiltered gallery; the
 * browser then re-renders with the real URL.
 *
 * The store keeps its own copy of the query string and only mirrors it into
 * the address bar, debounced and best-effort: Safari throws once a page calls
 * `history.replaceState` more than about 100 times in 10 seconds, and a
 * keystroke-per-call search box gets there. Were the URL the only copy, the
 * search box would stop accepting input at that point.
 */
let current: string | null = null;
const listeners = new Set<() => void>();
const URL_WRITE_DELAY_MS = 250;
let pendingWrite: ReturnType<typeof setTimeout> | undefined;

function getSnapshot(): string {
  current ??= window.location.search;
  return current;
}

function notify() {
  for (const listener of listeners) listener();
}

/** Back/forward: the address bar is the truth again. */
function onPopState() {
  current = window.location.search;
  notify();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("popstate", onPopState);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("popstate", onPopState);
    }
  };
}

function writeUrl() {
  pendingWrite = undefined;
  try {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${current ?? ""}`,
    );
  } catch {
    // Throttled (see above). The next change writes the whole query string,
    // so the address bar catches up then.
  }
}

export function useSearchParams(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, getSnapshot, () => "");
  return useMemo(() => new URLSearchParams(search), [search]);
}

/** Set (or, with `null`/`""`, remove) query parameters without navigating. */
export function setSearchParams(updates: Record<string, string | null>) {
  const params = new URLSearchParams(getSnapshot());
  for (const [key, value] of Object.entries(updates)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const search = params.toString();
  current = search ? `?${search}` : "";
  notify();
  clearTimeout(pendingWrite);
  pendingWrite = setTimeout(writeUrl, URL_WRITE_DELAY_MS);
}
