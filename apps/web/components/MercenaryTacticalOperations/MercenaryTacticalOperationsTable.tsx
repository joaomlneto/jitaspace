"use client";

import { memo, useMemo } from "react";
import { Anchor, Badge, Group, Skeleton, Stack, Text } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { EveEntityAvatar, EveEntityName } from "@jitaspace/eve-components";
import { TimeAgoText } from "@jitaspace/ui";

import type { OperationRow } from "./operationRows";
import { DungeonAnchor, EveEntityAnchor } from "~/components/Anchor";
import { DataTable } from "~/components/DataTable";
import { HoverPrefetchLink } from "~/components/Link";
import { PlanetName } from "~/components/Text";
import classes from "./MercenaryTacticalOperations.module.css";
import {
  OPERATION_STATE_COLORS,
  OPERATION_STATE_DESCRIPTIONS,
  OPERATION_STATE_LABELS,
  OPERATION_STATES,
  operationName,
} from "./operationRows";

export interface MercenaryTacticalOperationsTableProps {
  operations: OperationRow[];
  /**
   * Add a column naming the characters that can see each operation. Decided by
   * the caller from how many characters were queried, because with one it
   * would repeat the same name on every row. Added or left out rather than
   * hidden: the table reads `defaultVisible` once, on mount.
   */
  showCharacters: boolean;
  isLoading?: boolean;
  emptyText?: string;
}

/** `2026-11-01 12:00`, in EVE time (UTC), as players read times in game. */
export function formatEveTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().slice(0, 16).replace("T", " ");
}

const signed = new Intl.NumberFormat("en-US", { signDisplay: "exceptZero" });
const plain = new Intl.NumberFormat("en-US");

/** A placeholder for a value that arrives with the operation's details. */
function DetailsPending({ row }: Readonly<{ row: OperationRow }>) {
  if (row.detailsStatus === "failed") {
    return (
      <Text size="sm" className={classes.secondary} fs="italic">
        Unavailable
      </Text>
    );
  }
  return <Skeleton height={14} width={80} radius="sm" />;
}

function operationCell(row: OperationRow) {
  if (row.detailsStatus !== "loaded") return <DetailsPending row={row} />;
  return (
    <Stack gap={2}>
      <DungeonAnchor dungeonId={row.dungeonId} size="sm" fw={500}>
        {operationName(row)}
      </DungeonAnchor>
      {row.kind?.description && (
        <Text size="xs" className={classes.secondary} lineClamp={2}>
          {row.kind.description}
        </Text>
      )}
    </Stack>
  );
}

function stateCell(row: OperationRow) {
  if (row.state === undefined) return <DetailsPending row={row} />;
  return (
    <Badge
      color={OPERATION_STATE_COLORS[row.state]}
      variant="light"
      className={classes.status}
      title={OPERATION_STATE_DESCRIPTIONS[row.state]}
    >
      {OPERATION_STATE_LABELS[row.state]}
    </Badge>
  );
}

function expiresCell(row: OperationRow) {
  if (row.expires === undefined) return <DetailsPending row={row} />;
  // Both the relative time and the absolute one are on screen, rather than
  // the absolute one in a hover card, so keyboard and touch users get it too.
  return (
    <Stack gap={0}>
      <time dateTime={row.expires}>
        <TimeAgoText
          span
          size="sm"
          date={new Date(row.expires)}
          addSuffix
          updateInterval={30_000}
        />
      </time>
      <Text size="xs" className={`${classes.secondary} ${classes.timestamp}`}>
        {formatEveTime(row.expires)} EVE
      </Text>
    </Stack>
  );
}

function charactersCell(row: OperationRow) {
  return (
    <Stack gap={4}>
      {row.characterIds.map((characterId) => (
        <Group key={characterId} gap="xs" wrap="nowrap">
          <EveEntityAvatar
            entityId={characterId}
            category="character"
            size="sm"
          />
          <EveEntityAnchor
            size="sm"
            entityId={characterId}
            category="character"
          >
            <EveEntityName entityId={characterId} category="character" />
          </EveEntityAnchor>
        </Group>
      ))}
    </Stack>
  );
}

function locationCell(row: OperationRow) {
  if (row.planetId === undefined && row.locationPending) {
    return <Skeleton height={14} width={80} radius="sm" />;
  }
  if (row.planetId === undefined) {
    return (
      <Text size="sm" className={classes.secondary} fs="italic">
        Unknown
      </Text>
    );
  }
  return (
    <Anchor
      component={HoverPrefetchLink}
      href={`/planet/${row.planetId}`}
      size="sm"
    >
      <PlanetName span inherit planetId={row.planetId} />
    </Anchor>
  );
}

const impactCell = (value: number | undefined) =>
  value === undefined ? null : signed.format(value);

const stateOrder = (row: OperationRow) =>
  row.state === undefined ? undefined : OPERATION_STATES.indexOf(row.state);

const expiryTime = (row: OperationRow) =>
  row.expires === undefined
    ? Number.POSITIVE_INFINITY
    : Date.parse(row.expires);

/** Soonest first, operations still without an expiry last. */
const byExpiry = (a: OperationRow, b: OperationRow) => {
  const left = expiryTime(a);
  const right = expiryTime(b);
  if (left === right) return 0;
  return left < right ? -1 : 1;
};

export const MercenaryTacticalOperationsTable = memo(
  ({
    operations,
    showCharacters,
    isLoading = false,
    emptyText,
  }: MercenaryTacticalOperationsTableProps) => {
    const columns = useMemo<DataTableColumn<OperationRow>[]>(
      () => [
        {
          id: "operation",
          header: "Operation",
          // The name rather than the dungeon id, so the search box and the
          // column filter both work on what the user reads.
          accessor: (row) =>
            row.detailsStatus === "loaded" ? operationName(row) : undefined,
          sortable: true,
          filter: { type: "select" },
          cell: operationCell,
          enableHiding: false,
        },
        {
          id: "state",
          header: "Status",
          accessor: (row) =>
            row.state === undefined
              ? undefined
              : OPERATION_STATE_LABELS[row.state],
          sortable: true,
          sortAccessor: stateOrder,
          cell: stateCell,
        },
        {
          id: "expires",
          header: "Expires",
          accessor: "expires",
          sortable: true,
          cell: expiresCell,
        },
        ...(showCharacters
          ? [
              {
                id: "characters",
                header: "Characters",
                accessor: (row) => row.characterIds,
                cell: charactersCell,
              } satisfies DataTableColumn<OperationRow>,
            ]
          : []),
        {
          id: "location",
          header: "Location",
          accessor: "planetId",
          cell: locationCell,
        },
        {
          id: "development",
          header: "Development",
          accessor: (row) => row.kind?.developmentImpact,
          sortable: true,
          align: "right",
          cell: (row) => impactCell(row.kind?.developmentImpact),
        },
        {
          id: "anarchy",
          header: "Anarchy",
          accessor: (row) => row.kind?.anarchyImpact,
          sortable: true,
          align: "right",
          cell: (row) => impactCell(row.kind?.anarchyImpact),
        },
        {
          id: "infomorphs",
          header: "Infomorphs",
          accessor: (row) => row.kind?.infomorphBonus,
          sortable: true,
          align: "right",
          cell: (row) =>
            row.kind === undefined
              ? null
              : plain.format(row.kind.infomorphBonus),
        },
        {
          id: "operationId",
          header: "Operation ID",
          accessor: "operationId",
          defaultVisible: false,
        },
        {
          id: "mercenaryDenId",
          header: "Mercenary Den ID",
          accessor: "mercenaryDenId",
          defaultVisible: false,
        },
      ],
      [showCharacters],
    );

    // Pre-sorted by expiry so that, under the initial sort by status, each
    // status lists what expires soonest first: a sort leaves ties in the order
    // it was given them.
    const rows = useMemo(() => [...operations].sort(byExpiry), [operations]);

    return (
      <DataTable
        data={rows}
        columns={columns}
        rowId={(row) => row.operationId}
        isLoading={isLoading}
        emptyText={emptyText}
        withGlobalFilter
        withColumnVisibility
        withPagination
        defaultPageSize={25}
        // What can still be done first (Available, then In progress), and
        // within each status what expires soonest.
        initialSort={{ columnId: "state", direction: "asc" }}
        verticalSpacing="xs"
        highlightOnHover
        striped
      />
    );
  },
);
MercenaryTacticalOperationsTable.displayName =
  "MercenaryTacticalOperationsTable";
