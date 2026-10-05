"use client";

import { useLocalStorage } from "@mantine/hooks";

import type { ResourceState } from "./characterResources";
import type { PersonalFilterSwitchProps } from "./PersonalFilterSwitch";

/** A filter toggle remembered in localStorage under `key` (off by default). */
export function useStoredToggle(key: string) {
  return useLocalStorage<boolean>({ key, defaultValue: false });
}

export interface PersonalFilter<T> {
  /** The data to filter on, when the filter is on and that data has loaded. */
  value: T | undefined;
  /** On, with its data still loading. */
  awaiting: boolean;
  switchProps: Pick<
    PersonalFilterSwitchProps,
    "checked" | "disabled" | "unavailableHint" | "onChange"
  >;
}

/**
 * A remembered on/off filter over one piece of the character's data. It
 * applies once that data has loaded; turning it on is what requests the data
 * (the caller fetches while `on`). It is drawn on only where it takes effect
 * or is about to, so a disabled switch never shows ON next to unfiltered
 * content, and it can be turned off again while loading.
 */
export function personalFilter<T>(
  on: boolean,
  setOn: (on: boolean) => void,
  state: ResourceState<T>,
): PersonalFilter<T> {
  const awaiting = on && state.status === "loading";
  return {
    value: on && state.status === "ready" ? state.value : undefined,
    awaiting,
    switchProps: {
      checked: on && (state.status === "ready" || awaiting),
      disabled: state.status === "unavailable" || state.status === "error",
      unavailableHint:
        state.status === "unavailable" || state.status === "error"
          ? state.hint
          : null,
      onChange: setOn,
    },
  };
}
