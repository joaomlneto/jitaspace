"use client";

import type { DataTableProps } from "@jitaspace/datatable";
import { DataTable as MantineDataTable } from "@jitaspace/datatable-mantine";
import { DataTable as TanstackDataTable } from "@jitaspace/datatable-tanstack";

import { usePreferencesStore } from "~/lib/preferences";

/**
 * The app's data table. Takes the engine-agnostic props and renders them with
 * the engine chosen under Settings → General → Data tables: TanStack Table
 * (the default) or `mantine-datatable`. Both implement the same contract, and
 * share their sort and filter semantics through `@jitaspace/datatable-common`,
 * so a table is written once and works the same under either.
 */
export function DataTable<TData>(props: Readonly<DataTableProps<TData>>) {
  const engine = usePreferencesStore((state) => state.dataTableEngine);

  return engine === "mantine-datatable" ? (
    <MantineDataTable {...props} />
  ) : (
    <TanstackDataTable {...props} />
  );
}
