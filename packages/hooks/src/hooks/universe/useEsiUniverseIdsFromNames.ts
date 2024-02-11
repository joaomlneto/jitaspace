"use client";

import { useEffect, useMemo, useState } from "react";

import {
  postUniverseIds,
  PostUniverseIdsMutationResponse,
} from "@jitaspace/esi-client";





export const useEsiUniverseIdsFromNames = (names: string[]) => {
  const sortedNames = useMemo(() => names.sort(), [names]);

  const sortedNamesAsString = useMemo(
    () => JSON.stringify(sortedNames),
    [sortedNames],
  );

  console.log({ sortedNames });

  const [result, setResult] = useState<{
    loading: boolean;
    error?: string;
    data?: PostUniverseIdsMutationResponse;
  }>({ loading: true });

  console.log({ result });

  useEffect(() => {
    const fetchIds = async () => {
      const f = await postUniverseIds(sortedNames);
      if (f.status >= 400) {
        setResult({
          loading: false,
          error: f.statusText,
        });
      } else {
        setResult({
          loading: false,
          data: f.data,
        });
      }
    };

    if (sortedNames.length == 0) return;
    void fetchIds();
  }, [sortedNamesAsString]);

  console.log({ result });

  return result;
};
