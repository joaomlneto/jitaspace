"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  Button,
  Group,
  MultiSelect,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { DatePicker } from "@mantine/dates";

import type {
  DataTableColumn,
  DataTableColumnFilter,
  DataTableFilterOption,
} from "@jitaspace/datatable";

import type { ColumnFilterValue, DayRange, NumberRange } from "./filters";
import {
  facetOptions,
  isColumnFilterActive,
  isDayRange,
  isNumberRange,
  numericBounds,
} from "./filters";
import { readFilterValue } from "./values";

/**
 * How many options a select dropdown renders at once. The LP store's item
 * filter facets thousands of names, and rendering them all makes the dropdown
 * stall on open; typing narrows the list instead.
 */
const OPTION_LIMIT = 200;

// The control lives inside the column's filter popover. A dropdown portalled to
// <body> would count as a click outside that popover and close it.
const INLINE_DROPDOWN = { withinPortal: false } as const;

const BOOLEAN_OPTIONS = [
  { label: "Any", value: "any" },
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

export interface ColumnFilterControlProps<TData> {
  /** The column being filtered. Must have a `filter`. */
  column: DataTableColumn<TData>;
  /** Every row, unfiltered — the source of faceted options and range hints. */
  rows: readonly TData[];
  /** The column's current filter value, as stored by the engine. */
  value: unknown;
  /** Called with the new value, or `undefined` once it no longer filters. */
  onChange: (value: ColumnFilterValue | undefined) => void;
}

/**
 * The input for one column filter, chosen by the column's filter type. Both
 * DataTable engines render it — TanStack in its own header popover,
 * mantine-datatable in its built-in one — so filtering looks and behaves the
 * same whichever engine is selected.
 */
export function ColumnFilterControl<TData>({
  column,
  rows,
  value,
  onChange,
}: Readonly<ColumnFilterControlProps<TData>>) {
  const filter = column.filter;
  const type = filter?.type;
  // Only computed while the popover is open (the control is not mounted
  // otherwise), only for the types that use it, and once rather than per
  // keystroke: faceting walks every row, and /lp-store/all has thousands.
  const usesValues =
    type === "select" || type === "multi-select" || type === "range";
  const values = useMemo(
    () => (usesValues ? rows.map((row) => readFilterValue(column, row)) : []),
    [usesValues, rows, column],
  );
  const options = useMemo(
    () =>
      filter?.type === "select" || filter?.type === "multi-select"
        ? (filter.options ?? facetOptions(values))
        : [],
    [filter, values],
  );
  if (!filter) return null;

  const label = `Filter ${column.header}`;
  const emit = (next: unknown) =>
    onChange(isColumnFilterActive(filter, next) ? next : undefined);

  return (
    <Stack gap="xs" miw={220}>
      <FilterInput
        filter={filter}
        label={label}
        values={values}
        options={options}
        value={value}
        emit={emit}
      />
      {isColumnFilterActive(filter, value) && (
        <Group justify="flex-end">
          <Button
            variant="subtle"
            size="compact-xs"
            onClick={() => onChange(undefined)}
          >
            Clear
          </Button>
        </Group>
      )}
    </Stack>
  );
}

interface FilterInputProps {
  filter: DataTableColumnFilter;
  label: string;
  /** Every row's filter value; for a range's bounds. */
  values: unknown[];
  /** The choices a select offers. */
  options: DataTableFilterOption[];
  value: unknown;
  emit: (next: unknown) => void;
}

function FilterInput({
  filter,
  label,
  values,
  options,
  value,
  emit,
}: Readonly<FilterInputProps>): ReactNode {
  switch (filter.type) {
    case "text":
      return (
        <TextInput
          aria-label={label}
          placeholder="Contains…"
          size="xs"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => emit(event.currentTarget.value)}
        />
      );
    case "select":
      return (
        <Select
          aria-label={label}
          placeholder="Any"
          size="xs"
          data={options}
          value={typeof value === "string" ? value : null}
          onChange={(next) => emit(next ?? "")}
          searchable
          clearable
          limit={OPTION_LIMIT}
          nothingFoundMessage="No matches"
          comboboxProps={INLINE_DROPDOWN}
        />
      );
    case "multi-select":
      return (
        <MultiSelect
          aria-label={label}
          placeholder="Any"
          size="xs"
          data={options}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={emit}
          searchable
          clearable
          limit={OPTION_LIMIT}
          nothingFoundMessage="No matches"
          comboboxProps={INLINE_DROPDOWN}
          maw={320}
        />
      );
    case "range":
      return (
        <RangeInput
          filter={filter}
          label={label}
          values={values}
          value={isNumberRange(value) ? value : [null, null]}
          emit={emit}
        />
      );
    case "boolean":
      return (
        <SegmentedControl
          aria-label={label}
          size="xs"
          data={BOOLEAN_OPTIONS}
          value={typeof value === "boolean" ? String(value) : "any"}
          onChange={(next) =>
            emit(next === "any" ? undefined : next === "true")
          }
        />
      );
    case "date-range": {
      const days: DayRange = isDayRange(value) ? value : [null, null];
      return (
        <DatePicker
          aria-label={label}
          type="range"
          allowSingleDateInRange
          size="xs"
          value={days}
          // Open on the chosen range rather than on today's month.
          defaultDate={days[0] ?? days[1] ?? undefined}
          onChange={emit}
        />
      );
    }
  }
}

interface RangeInputProps {
  filter: Extract<DataTableColumnFilter, { type: "range" }>;
  label: string;
  values: unknown[];
  value: NumberRange;
  emit: (next: NumberRange) => void;
}

function RangeInput({
  filter,
  label,
  values,
  value: [min, max],
  emit,
}: Readonly<RangeInputProps>) {
  // The data's own extremes, shown as placeholders so an open bound says what
  // it currently means.
  const bounds = useMemo(() => numericBounds(values), [values]);
  const toBound = (input: number | string) =>
    typeof input === "number" ? input : null;
  const common = {
    size: "xs",
    min: filter.min,
    max: filter.max,
    step: filter.step,
    thousandSeparator: ",",
    w: 130,
  } as const;
  return (
    <Group gap="xs" wrap="nowrap" role="group" aria-label={label}>
      <NumberInput
        {...common}
        label="Min"
        placeholder={bounds?.min.toLocaleString()}
        value={min ?? ""}
        onChange={(input) => emit([toBound(input), max])}
      />
      <NumberInput
        {...common}
        label="Max"
        placeholder={bounds?.max.toLocaleString()}
        value={max ?? ""}
        onChange={(input) => emit([min, toBound(input)])}
      />
    </Group>
  );
}
