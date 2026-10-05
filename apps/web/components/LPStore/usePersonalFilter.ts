"use client";

import { useLocalStorage } from "@mantine/hooks";

import type { PersonalFilterSwitchProps } from "./PersonalFilterSwitch";
import type { ResourceState } from "./usePurchasingPower";

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
 * applies only once that data has loaded, and is drawn on only where it takes
 * effect (or is about to), so a disabled switch never shows ON next to an
 * unfiltered table.
 */
export function usePersonalFilter<T>(
  storageKey: string,
  state: ResourceState<T>,
): PersonalFilter<T> {
  const [on, setOn] = useLocalStorage<boolean>({
    key: storageKey,
    defaultValue: false,
  });
  const awaiting = on && state.status === "loading";
  return {
    value: on && state.status === "ready" ? state.value : undefined,
    awaiting,
    switchProps: {
      checked: on && (state.status === "ready" || awaiting),
      disabled: state.status !== "ready",
      unavailableHint:
        state.status === "unavailable" || state.status === "error"
          ? state.hint
          : null,
      onChange: setOn,
    },
  };
}
