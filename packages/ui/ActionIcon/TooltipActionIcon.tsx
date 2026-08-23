"use client";

import type { ActionIconProps } from "@mantine/core";
import type { ReactNode } from "react";
import { memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";

export type TooltipActionIconProps = ActionIconProps & {
  /** Serves as both the tooltip text and the button's accessible name. */
  label: string;
  onActivate?: () => void;
  disabled?: boolean;
  children: ReactNode;
};

/**
 * An icon-only ActionIcon that stays explainable while it is unavailable.
 *
 * Two things a bare `<Tooltip><ActionIcon /></Tooltip>` does not handle:
 *
 * - The button's only child is an icon, so without `aria-label` it has no
 *   accessible name at all.
 * - A natively `disabled` button is removed from the tab order and receives no
 *   mouse events — the browser retargets them to an ancestor — so its tooltip
 *   never opens, in exactly the state that most needs explaining, since these
 *   buttons go unavailable whenever no handler is passed.
 *
 * So unavailability is expressed with `aria-disabled` plus Mantine's
 * `data-disabled` (which applies the disabled styling without the native
 * attribute) rather than with `disabled`, and the click handler is dropped.
 * The button stays focusable and hoverable, so a screen reader announces the
 * name, the dimmed state and the tooltip together, and the tooltip opts into
 * focus and touch events — Mantine's default is `{ hover: true, focus: false,
 * touch: false }` — so pointer users are not the only ones who see it.
 */
export const TooltipActionIcon = memo(
  ({
    label,
    onActivate,
    disabled,
    children,
    ...actionIconProps
  }: TooltipActionIconProps) => {
    const isDisabled = !onActivate || disabled;

    return (
      <Tooltip
        color="dark"
        label={label}
        events={{ hover: true, focus: true, touch: true }}
      >
        <ActionIcon
          aria-label={label}
          radius="xl"
          {...actionIconProps}
          // `false` would still render as the string "false" and read as
          // disabled, so drop the attributes entirely when the button works.
          data-disabled={isDisabled || undefined}
          aria-disabled={isDisabled || undefined}
          onClick={isDisabled ? undefined : onActivate}
        >
          {children}
        </ActionIcon>
      </Tooltip>
    );
  },
);
TooltipActionIcon.displayName = "TooltipActionIcon";
