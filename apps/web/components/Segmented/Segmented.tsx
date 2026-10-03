"use client";

import { useId } from "react";

import classes from "./Segmented.module.css";

export interface SegmentedProps<T extends string> {
  /** Names the group for assistive tech. */
  label: string;
  value: T;
  onChange: (value: T) => void;
  data: readonly { value: T; label: string }[];
  /** Mantine's xs or sm. Default: `"xs"`. */
  size?: "xs" | "sm";
  disabled?: boolean;
}

/**
 * A segmented control: one choice from a few, as a row of radio buttons. Use
 * it instead of Mantine's `SegmentedControl` anywhere a page is rendered on
 * the server (ESLint enforces this in apps/web).
 *
 * `SegmentedControl` calls `useState(randomId())` — `Math.random()` while
 * rendering. Under `cacheComponents` that makes its Suspense boundary dynamic,
 * so a prerendered or ISR page caches without its content: the build stays
 * green, the route still shows `○`, and every visitor after the first renders
 * it in the browser. Native radios need no generated IDs, and bring
 * arrow-key navigation and screen-reader semantics with them.
 */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  data,
  size = "xs",
  disabled = false,
}: Readonly<SegmentedProps<T>>) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={classes.root}
      data-size={size}
      data-disabled={disabled || undefined}
    >
      {data.map((option) => (
        <label
          key={option.value}
          className={classes.segment}
          data-active={option.value === value || undefined}
        >
          <input
            type="radio"
            className={classes.input}
            name={name}
            value={option.value}
            checked={option.value === value}
            disabled={disabled}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
