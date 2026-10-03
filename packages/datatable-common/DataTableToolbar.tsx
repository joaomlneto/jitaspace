"use client";

import { useState } from "react";
import {
  Button,
  Checkbox,
  Divider,
  Group,
  Popover,
  Stack,
  TextInput,
} from "@mantine/core";

/** A column as the visibility menu lists it. */
export interface ToolbarColumn {
  id: string;
  label: string;
  visible: boolean;
}

export interface DataTableToolbarProps {
  /** Render the search box. */
  withGlobalFilter: boolean;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;

  /** Render the "Columns" menu. */
  withColumnVisibility: boolean;
  /** The columns the menu may toggle — those that can be hidden. */
  hideableColumns: ToolbarColumn[];
  onToggleColumn: (id: string) => void;
  /** Show every hideable column, or hide them all when all are showing. */
  onToggleAllColumns: () => void;

  /** How many column filters are set; shows "Clear filters" when non-zero. */
  activeFilterCount: number;
  onClearFilters: () => void;
}

/**
 * The controls above a DataTable: the global search box, a "Clear filters"
 * button while any column filter is set, and the column-visibility menu. Both
 * engines render this same toolbar.
 */
export function DataTableToolbar({
  withGlobalFilter,
  globalFilter,
  onGlobalFilterChange,
  withColumnVisibility,
  hideableColumns,
  onToggleColumn,
  onToggleAllColumns,
  activeFilterCount,
  onClearFilters,
}: Readonly<DataTableToolbarProps>) {
  const [columnsMenuOpened, setColumnsMenuOpened] = useState(false);

  if (!withGlobalFilter && !withColumnVisibility && activeFilterCount === 0) {
    return null;
  }

  const allVisible = hideableColumns.every((column) => column.visible);
  const someVisible = hideableColumns.some((column) => column.visible);

  return (
    <Group justify="space-between" align="flex-start">
      {withGlobalFilter ? (
        <TextInput
          placeholder="Search..."
          aria-label="Search"
          value={globalFilter}
          onChange={(event) => onGlobalFilterChange(event.currentTarget.value)}
          style={{ flex: 1, maxWidth: 320 }}
        />
      ) : (
        <span />
      )}
      <Group gap="xs">
        {activeFilterCount > 0 && (
          <Button variant="subtle" size="xs" onClick={onClearFilters}>
            Clear filters ({activeFilterCount})
          </Button>
        )}
        {withColumnVisibility && (
          <Popover
            opened={columnsMenuOpened}
            onChange={setColumnsMenuOpened}
            position="bottom-end"
            shadow="md"
            withinPortal
          >
            <Popover.Target>
              <Button
                variant="default"
                size="xs"
                onClick={() => setColumnsMenuOpened((opened) => !opened)}
              >
                Columns
              </Button>
            </Popover.Target>
            <Popover.Dropdown>
              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                <Stack gap="xs">
                  <Checkbox
                    size="xs"
                    label="Toggle all"
                    checked={allVisible}
                    indeterminate={someVisible && !allVisible}
                    onChange={onToggleAllColumns}
                  />
                  <Divider />
                  {hideableColumns.map((column) => (
                    <Checkbox
                      key={column.id}
                      size="xs"
                      label={column.label}
                      checked={column.visible}
                      onChange={() => onToggleColumn(column.id)}
                    />
                  ))}
                </Stack>
              </div>
            </Popover.Dropdown>
          </Popover>
        )}
      </Group>
    </Group>
  );
}
