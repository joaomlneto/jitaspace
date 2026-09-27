"use client";

import { useEffect, useMemo, useState } from "react";

import type { PostUniverseIdsMutationResponse } from "@jitaspace/esi-client";
import { postUniverseIds } from "@jitaspace/esi-client";

interface UniverseIdsResult {
  loading: boolean;
  error?: string;
  data?: PostUniverseIdsMutationResponse;
}

/** Nothing to resolve, so nothing is loading. Stable so callers can memo on it. */
const NOTHING_TO_RESOLVE: UniverseIdsResult = { loading: false };

export const useEsiUniverseIdsFromNames = (names: string[]) => {
  const sortedNames = useMemo(
    () => names.toSorted((a, b) => a.localeCompare(b)),
    [names],
  );

  const sortedNamesAsString = useMemo(
    () => JSON.stringify(sortedNames),
    [sortedNames],
  );

  const [result, setResult] = useState<UniverseIdsResult>({ loading: true });

  useEffect(() => {
    // Keyed on the serialised list, not the array, so a caller passing a fresh
    // array with the same names does not refetch — and read from that same
    // string, so the effect never uses a list other than the one it keyed on.
    const namesToResolve = JSON.parse(sortedNamesAsString) as string[];
    if (namesToResolve.length === 0) return;

    // A slow response for an earlier list must not overwrite the answer for
    // the current one.
    let cancelled = false;
    postUniverseIds(namesToResolve)
      .then((response) => {
        if (cancelled) return;
        setResult(
          response.status >= 400
            ? { loading: false, error: response.statusText }
            : { loading: false, data: response.data },
        );
      })
      // The client rejects on a non-2xx response rather than resolving with
      // it, so this is where a failed lookup actually lands. Without it the
      // rejection went unhandled and the hook reported loading forever.
      .catch((error: unknown) => {
        if (cancelled) return;
        setResult({
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [sortedNamesAsString]);

  // Derived rather than stored: an empty list is settled from the first
  // render, where the initial `loading: true` used to stick because the effect
  // returns before ever setting a result.
  return sortedNames.length === 0 ? NOTHING_TO_RESOLVE : result;
};
