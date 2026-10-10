import { useMemo, useSyncExternalStore } from "react";

/**
 * The query string as a store, so shareable state (search, set filter, open
 * icon) lives in the URL itself. On the server and during hydration it reads
 * as empty, which lets the static export prerender the unfiltered gallery;
 * the browser then re-renders with the real URL.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

export function useSearchParams(): URLSearchParams {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  return useMemo(() => new URLSearchParams(search), [search]);
}

/** Set (or, with `null`/`""`, remove) query parameters without navigating. */
export function setSearchParams(updates: Record<string, string | null>) {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(updates)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const search = params.toString();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${search ? `?${search}` : ""}`,
  );
  for (const listener of listeners) listener();
}
