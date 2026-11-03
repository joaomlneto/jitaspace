"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

import type { HistoryLabels } from "~/lib/history-labels";
import { EMPTY_HISTORY_LABELS } from "~/lib/history-labels";

const HistoryLabelsContext = createContext<HistoryLabels>(EMPTY_HISTORY_LABELS);

/**
 * Supplies the labels the server read with a timeline (`readHistoryLabels`) to
 * every label beneath it, so none of them fetches anything.
 */
export function HistoryLabelsProvider({
  labels,
  children,
}: Readonly<{ labels: HistoryLabels; children: ReactNode }>) {
  return (
    <HistoryLabelsContext.Provider value={labels}>
      {children}
    </HistoryLabelsContext.Provider>
  );
}

export const useHistoryLabels = () => useContext(HistoryLabelsContext);

/** An entity's name; undefined when nothing names it. */
export function useEntityName(kind: string, id: number): string | undefined {
  return useHistoryLabels().names[kind]?.[id];
}
