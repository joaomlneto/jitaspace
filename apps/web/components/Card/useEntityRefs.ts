"use client";

import { useCallback, useMemo } from "react";

import type { EntityRef } from "@jitaspace/ui";
import { useEsiNameLookup } from "@jitaspace/hooks";

import { stripEveMarkup } from "~/lib/eveMarkup";

/**
 * Resolves the names of every entity a card refers to in one lookup, and
 * returns a function turning an id into the `EntityRef` the cards take: the id
 * with its name once known, `undefined` without an id.
 */
export const useEntityRefs = (ids: readonly (number | null | undefined)[]) => {
  const key = ids.filter((id) => typeof id === "number" && id > 0).join(",");
  const entries = useMemo(
    () =>
      key === ""
        ? []
        : [...new Set(key.split(",").map(Number))].map((id) => ({ id })),
    [key],
  );
  const names = useEsiNameLookup(entries);

  return useCallback(
    (id?: number | null): EntityRef | undefined =>
      typeof id === "number" && id > 0
        ? { id, name: names[id.toString()]?.value?.name }
        : undefined,
    [names],
  );
};

/**
 * EVE's rich text (descriptions) as plain text for a card, as the game client
 * shows it; `undefined` when nothing is left.
 */
export const plainText = (value?: string) => {
  const text = value === undefined ? undefined : stripEveMarkup(value);
  return text === "" ? undefined : text;
};
