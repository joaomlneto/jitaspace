"use client";

import { useId } from "react";
import { Switch, Tooltip, VisuallyHidden } from "@mantine/core";

export interface PersonalFilterSwitchProps {
  label: string;
  /** Shown under the label in every state, so it never changes the layout. */
  description?: string;
  /**
   * Whether the switch is drawn on. Pass the saved preference only where it
   * takes effect, so a disabled switch is never drawn ON next to content it is
   * not filtering.
   */
  checked: boolean;
  disabled: boolean;
  /**
   * Why the switch is unavailable, or null when there is nothing to explain
   * (including while the data it needs is loading).
   */
  unavailableHint: string | null;
  onChange: (checked: boolean) => void;
}

/**
 * A switch for a filter that needs the selected character's own data (LP,
 * wallet, assets). Render it unconditionally: the auth store rehydrates only
 * on the client, so a control that appeared then would shift the page — on a
 * phone it wraps onto a row of its own and pushes everything below it down.
 *
 * When unavailable it is disabled and says why, as a tooltip for pointer and
 * touch users and through `aria-describedby` for everyone else: a disabled
 * input takes no focus, so a tooltip alone cannot be reached by keyboard.
 */
export function PersonalFilterSwitch({
  label,
  description,
  checked,
  disabled,
  unavailableHint,
  onChange,
}: Readonly<PersonalFilterSwitchProps>) {
  const hintId = useId();
  return (
    <Tooltip
      label={unavailableHint}
      disabled={unavailableHint === null}
      events={{ hover: true, focus: true, touch: true }}
      multiline
      w={260}
    >
      <div>
        <Switch
          label={label}
          // Mantine renders the description inside the label, which would
          // make it part of the accessible name too; it is announced once,
          // as the description, through `aria-describedby`.
          aria-label={label}
          description={description}
          checked={checked}
          disabled={disabled}
          aria-describedby={unavailableHint === null ? undefined : hintId}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        {unavailableHint !== null && (
          <VisuallyHidden id={hintId}>{unavailableHint}</VisuallyHidden>
        )}
      </div>
    </Tooltip>
  );
}
