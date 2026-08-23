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
 * An icon-only ActionIcon that stays explainable while it is disabled.
 *
 * Two things a bare `<Tooltip><ActionIcon /></Tooltip>` does not handle:
 *
 * - The button's only child is an icon, so without `aria-label` it has no
 *   accessible name at all.
 * - A disabled button receives no mouse events — the browser retargets them to
 *   an ancestor — so a tooltip attached to the button never opens, in exactly
 *   the state that most needs explaining, since these buttons disable
 *   themselves whenever no handler is passed. The wrapper is the live target.
 *
 * The wrapper is also focusable while disabled, and the tooltip opts into focus
 * and touch events (Mantine's default is `{ hover: true, focus: false, touch:
 * false }`). Without both, only pointer users would ever see the explanation:
 * a disabled button is not itself focusable. That adds a tab stop for a
 * disabled control, which is the deliberate trade — a keyboard user can reach
 * the reason the control is dead.
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
        {/* Focusable only while disabled: when enabled the button itself takes
            focus and the focus event reaches this wrapper anyway. */}
        <span
          style={{ display: "inline-flex" }}
          tabIndex={isDisabled ? 0 : undefined}
        >
          <ActionIcon
            aria-label={label}
            radius="xl"
            {...actionIconProps}
            disabled={isDisabled}
            onClick={onActivate}
          >
            {children}
          </ActionIcon>
        </span>
      </Tooltip>
    );
  },
);
TooltipActionIcon.displayName = "TooltipActionIcon";
