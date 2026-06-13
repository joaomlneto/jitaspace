"use client";

import { useState } from "react";
import { Group, SegmentedControl, Stack, Text } from "@mantine/core";

import type { DataTableProps } from "@jitaspace/datatable";
import { DataTable as MantineDataTable } from "@jitaspace/datatable-mantine";
import { DataTable as TanstackDataTable } from "@jitaspace/datatable-tanstack";

import { usePreferencesStore } from "~/lib/preferences";
import { MantineReactTableImpl } from "./MantineReactTableImpl";

type DataTableEngine = "mantine-react-table" | "tanstack" | "mantine-datatable";

const ENGINE_OPTIONS: { value: DataTableEngine; label: string }[] = [
  { value: "mantine-react-table", label: "Classic" },
  { value: "tanstack", label: "TanStack" },
  { value: "mantine-datatable", label: "mantine-datatable" },
];

const DEFAULT_EXPERIMENTAL_ENGINE: DataTableEngine = "tanstack";

/**
 * App-level DataTable that takes the engine-agnostic props and renders one of
 * three implementations.
 *
 * - When the "Experimental data tables" setting is OFF, it always renders the
 *   classic `mantine-react-table` engine (the long-standing behaviour).
 * - When ON, it renders the new agnostic implementations and exposes a
 *   per-table engine selector so the engines can be compared side by side.
 */
export function DataTable<TData>(props: Readonly<DataTableProps<TData>>) {
  const experimentalEnabled = usePreferencesStore(
    (state) => state.experimentalDataTables,
  );
  const [engine, setEngine] = useState<DataTableEngine>(
    DEFAULT_EXPERIMENTAL_ENGINE,
  );

  // Experimental disabled → classic behaviour (mantine-react-table everywhere).
  if (!experimentalEnabled) {
    return <MantineReactTableImpl {...props} />;
  }

  return (
    <Stack gap="xs">
      <Group justify="flex-end" gap="xs" wrap="nowrap">
        <Text size="xs" c="dimmed">
          Table engine
        </Text>
        <SegmentedControl
          size="xs"
          value={engine}
          onChange={(value) => setEngine(value)}
          data={ENGINE_OPTIONS}
        />
      </Group>
      {engine === "mantine-react-table" && <MantineReactTableImpl {...props} />}
      {engine === "tanstack" && <TanstackDataTable {...props} />}
      {engine === "mantine-datatable" && <MantineDataTable {...props} />}
    </Stack>
  );
}
