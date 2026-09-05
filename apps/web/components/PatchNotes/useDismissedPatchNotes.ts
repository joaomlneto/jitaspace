"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useLocalStorage } from "@mantine/hooks";

/** Default localStorage key for the dismissed patch-notes banner. */
export const DEFAULT_PATCH_NOTES_STORAGE_KEY =
  "jitaspace/dismissed-patch-notes-build";

// `mounted` gate implemented without a setState-in-effect: the store never
// emits, so the value is the client snapshot (`true`) after hydration and the
// server snapshot (`false`) during SSR/prerender. Same shape as
// `~/components/News/useDismissedNews`.
const subscribeNever = (): (() => void) => () => undefined;
const getMountedClientSnapshot = () => true;
const getMountedServerSnapshot = () => false;

export interface UseDismissedPatchNotesOptions {
  /** Build number of the newest recorded diff; `null` ⇒ nothing to announce. */
  build: number | null;
  /** Override the localStorage key (keeps tests / previews independent). */
  storageKey?: string;
}

export interface UseDismissedPatchNotesResult {
  /** Whether the banner should render. False until mounted. */
  visible: boolean;
  /** Whether the component has mounted on the client. */
  mounted: boolean;
  /** The build the user last dismissed, or `null` if they never have. */
  dismissedBuild: number | null;
  /** Hide the banner until a build newer than the current one appears. */
  dismiss: () => void;
  /** Forget the dismissal (the banner comes back). */
  reset: () => void;
}

/**
 * Remembers which build's patch notes the user has dismissed, persisted in
 * localStorage.
 *
 * Dismissal is stored as a build *number* rather than a boolean, so hiding the
 * banner only hides the build that was on screen: as soon as a newer build is
 * recorded, `build > dismissedBuild` and the banner returns on its own. A
 * non-numeric stored value (hand-edited, or written by an older format) is
 * treated as "never dismissed" rather than trusted.
 *
 * Rendering is gated on mount so the server output and the first client render
 * match — reading localStorage during render would otherwise risk a hydration
 * mismatch.
 */
export function useDismissedPatchNotes({
  build,
  storageKey = DEFAULT_PATCH_NOTES_STORAGE_KEY,
}: UseDismissedPatchNotesOptions): UseDismissedPatchNotesResult {
  const [stored, setStored] = useLocalStorage<number | null>({
    key: storageKey,
    defaultValue: null,
  });

  const mounted = useSyncExternalStore(
    subscribeNever,
    getMountedClientSnapshot,
    getMountedServerSnapshot,
  );

  const dismiss = useCallback(() => {
    if (build !== null) setStored(build);
  }, [build, setStored]);

  const reset = useCallback(() => setStored(null), [setStored]);

  const dismissedBuild = typeof stored === "number" ? stored : null;

  const visible =
    mounted &&
    build !== null &&
    (dismissedBuild === null || dismissedBuild < build);

  return { visible, mounted, dismissedBuild, dismiss, reset };
}
