"use client";

import type { ReactNode } from "react";
import { ActionIcon, Popover } from "@mantine/core";

/** A funnel, inline so this package needs no icon library. */
export function FilterIcon({ size = 14 }: Readonly<{ size?: number }>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 4h16v2.172a2 2 0 0 1-.586 1.414L15 12v7l-6 2v-8.5L4.52 7.572A2 2 0 0 1 4 6.227z" />
    </svg>
  );
}

export interface ColumnFilterButtonProps {
  /** The column header, for the button's accessible name. */
  label: string;
  /** Whether the column is currently filtered; highlights the button. */
  active: boolean;
  /** The filter control, rendered in the popover only while it is open. */
  children: ReactNode;
}

/**
 * A header button that opens a column's filter control in a popover — the
 * TanStack engine's counterpart to mantine-datatable's built-in column filter.
 *
 * The header cell sorts on click, and React bubbles events from a portalled
 * popover through the component tree, not the DOM. So clicks on the button
 * and anywhere in the dropdown stop here instead of re-sorting the column.
 */
export function ColumnFilterButton({
  label,
  active,
  children,
}: Readonly<ColumnFilterButtonProps>) {
  return (
    <Popover position="bottom" shadow="md" withinPortal trapFocus>
      <Popover.Target>
        <ActionIcon
          size="xs"
          variant={active ? "filled" : "subtle"}
          color={active ? undefined : "gray"}
          aria-label={`Filter ${label}`}
          aria-pressed={active}
          onClick={(event) => event.stopPropagation()}
        >
          <FilterIcon />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown onClick={(event) => event.stopPropagation()}>
        {children}
      </Popover.Dropdown>
    </Popover>
  );
}
