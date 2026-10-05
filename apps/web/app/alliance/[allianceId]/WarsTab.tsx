"use client";

import { Badge, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconSwords } from "@tabler/icons-react";

import type { DataTableColumn } from "@jitaspace/datatable";
import { ISKAmount, WarAnchor } from "@jitaspace/ui";

import type {
  AllianceWar,
  AllianceWarRole,
  AllianceWarStatus,
  AllianceWarSummary,
} from "./types";
import { DataTable } from "~/components/DataTable";
import { SectionHeading, StatCard } from "~/components/EntityPage";
import { WarEntity } from "~/components/Wars/WarRoom/parts";
import { formatDate, formatInteger, formatPercent } from "./format";
import { iskEfficiency } from "./zkillboard";

export const WAR_STATUS_LABELS: Record<AllianceWarStatus, string> = {
  pending: "Starting",
  active: "Active",
  retracting: "Ending",
  finished: "Finished",
};

const WAR_STATUS_COLORS: Record<AllianceWarStatus, string> = {
  pending: "yellow",
  active: "red",
  retracting: "orange",
  finished: "gray",
};

const WAR_ROLE_LABELS: Record<AllianceWarRole, string> = {
  aggressor: "Aggressor",
  defender: "Defender",
  ally: "Ally",
};

const WAR_ROLE_COLORS: Record<AllianceWarRole, string> = {
  aggressor: "red",
  defender: "blue",
  ally: "teal",
};

/**
 * The war from this alliance's side. An ally fights with the defender, so it
 * shares the defender's tally.
 */
interface WarRow extends AllianceWar {
  statusLabel: string;
  roleLabel: string;
  kills: number;
  losses: number;
  iskDestroyed: number;
  iskLost: number;
  efficiency: number | null;
}

export function toWarRow(war: AllianceWar): WarRow {
  const aggressor = war.role === "aggressor";
  const iskDestroyed = aggressor
    ? war.aggressorIskDestroyed
    : war.defenderIskDestroyed;
  const iskLost = aggressor
    ? war.defenderIskDestroyed
    : war.aggressorIskDestroyed;
  return {
    ...war,
    statusLabel: WAR_STATUS_LABELS[war.status],
    roleLabel: WAR_ROLE_LABELS[war.role],
    kills: aggressor ? war.aggressorShipsKilled : war.defenderShipsKilled,
    losses: aggressor ? war.defenderShipsKilled : war.aggressorShipsKilled,
    iskDestroyed,
    iskLost,
    efficiency: iskEfficiency(iskDestroyed, iskLost),
  };
}

const yesNo = (value: boolean) => (
  <Badge size="sm" variant="light" color={value ? "teal" : "gray"}>
    {value ? "Yes" : "No"}
  </Badge>
);

const columns: DataTableColumn<WarRow>[] = [
  {
    id: "war",
    header: "War",
    accessor: "warId",
    sortable: true,
    enableHiding: false,
    cell: (war) => (
      <WarAnchor warId={war.warId} prefetch={false}>
        #{war.warId}
      </WarAnchor>
    ),
  },
  {
    id: "status",
    header: "Status",
    accessor: "statusLabel",
    sortable: true,
    filter: { type: "select" },
    cell: (war) => (
      <Badge size="sm" variant="light" color={WAR_STATUS_COLORS[war.status]}>
        {war.statusLabel}
      </Badge>
    ),
  },
  {
    id: "role",
    header: "Role",
    accessor: "roleLabel",
    sortable: true,
    filter: { type: "select" },
    cell: (war) => (
      <Badge size="sm" variant="dot" color={WAR_ROLE_COLORS[war.role]}>
        {war.roleLabel}
      </Badge>
    ),
  },
  {
    id: "aggressor",
    header: "Aggressor",
    cell: (war) => (
      <WarEntity
        side="aggressor"
        allianceId={war.aggressorAllianceId ?? undefined}
        corporationId={war.aggressorCorporationId ?? undefined}
        linked
      />
    ),
  },
  {
    id: "defender",
    header: "Defender",
    cell: (war) => (
      <WarEntity
        side="defender"
        allianceId={war.defenderAllianceId ?? undefined}
        corporationId={war.defenderCorporationId ?? undefined}
        linked
      />
    ),
  },
  {
    id: "declared",
    header: "Declared",
    accessor: "declaredDate",
    sortable: true,
    filter: { type: "date-range" },
    cell: (war) => formatDate(war.declaredDate),
  },
  {
    id: "started",
    header: "Started",
    accessor: "startedDate",
    sortable: true,
    defaultVisible: false,
    cell: (war) => (war.startedDate ? formatDate(war.startedDate) : null),
  },
  {
    id: "finished",
    header: "Finished",
    accessor: "finishedDate",
    sortable: true,
    cell: (war) => (war.finishedDate ? formatDate(war.finishedDate) : null),
  },
  {
    id: "kills",
    header: "Kills",
    accessor: "kills",
    sortable: true,
    align: "right",
    cell: (war) => formatInteger(war.kills),
  },
  {
    id: "losses",
    header: "Losses",
    accessor: "losses",
    sortable: true,
    align: "right",
    cell: (war) => formatInteger(war.losses),
  },
  {
    id: "iskDestroyed",
    header: "ISK destroyed",
    accessor: "iskDestroyed",
    sortable: true,
    align: "right",
    cell: (war) => <ISKAmount amount={war.iskDestroyed} size="sm" />,
  },
  {
    id: "iskLost",
    header: "ISK lost",
    accessor: "iskLost",
    sortable: true,
    align: "right",
    cell: (war) => <ISKAmount amount={war.iskLost} size="sm" />,
  },
  {
    id: "efficiency",
    header: "Efficiency",
    accessor: "efficiency",
    sortable: true,
    align: "right",
    cell: (war) =>
      war.efficiency === null ? null : formatPercent(war.efficiency),
  },
  {
    id: "allies",
    header: "Allies",
    accessor: "allyCount",
    sortable: true,
    align: "right",
    defaultVisible: false,
  },
  {
    id: "mutual",
    header: "Mutual",
    accessor: "isMutual",
    sortable: true,
    filter: { type: "boolean" },
    defaultVisible: false,
    cell: (war) => yesNo(war.isMutual),
  },
  {
    id: "openForAllies",
    header: "Open for allies",
    accessor: "isOpenForAllies",
    sortable: true,
    filter: { type: "boolean" },
    defaultVisible: false,
    cell: (war) => yesNo(war.isOpenForAllies),
  },
];

export function WarSummaryCards({
  summary,
}: Readonly<{ summary: AllianceWarSummary }>) {
  const efficiency = iskEfficiency(summary.iskDestroyed, summary.iskLost);
  return (
    <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm">
      <StatCard
        label="Wars"
        value={formatInteger(summary.total)}
        sub={`${formatInteger(summary.ongoing)} ongoing`}
      />
      <StatCard
        label="As aggressor"
        value={formatInteger(summary.asAggressor)}
      />
      <StatCard label="As defender" value={formatInteger(summary.asDefender)} />
      <StatCard label="As ally" value={formatInteger(summary.asAlly)} />
      <StatCard
        label="ISK efficiency"
        value={efficiency === null ? "—" : formatPercent(efficiency)}
        sub="As aggressor or defender"
      />
      <StatCard
        label="Ships killed"
        value={formatInteger(summary.shipsKilled)}
      />
      <StatCard label="Ships lost" value={formatInteger(summary.shipsLost)} />
      <StatCard
        label="ISK destroyed"
        value={<ISKAmount amount={summary.iskDestroyed} />}
      />
      <StatCard
        label="ISK lost"
        value={<ISKAmount amount={summary.iskLost} />}
      />
    </SimpleGrid>
  );
}

export function WarsTab({
  rows,
  summary,
}: Readonly<{ rows: WarRow[]; summary: AllianceWarSummary }>) {
  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <SectionHeading icon={<IconSwords size={18} />}>
          War record
        </SectionHeading>
        <WarSummaryCards summary={summary} />
        <Text size="xs" c="dimmed">
          Kills and ISK count the wars this alliance declared or defended; wars
          it joined as an ally are tallied under the defender it helped.
        </Text>
      </Stack>
      <Stack gap="sm">
        <SectionHeading icon={<IconSwords size={18} />}>Wars</SectionHeading>
        <DataTable
          data={rows}
          columns={columns}
          rowId={(war) => war.warId}
          initialSort={{ columnId: "declared", direction: "desc" }}
          withGlobalFilter
          withColumnVisibility
          withPagination
          defaultPageSize={25}
          verticalSpacing="xs"
          highlightOnHover
          striped
        />
        {summary.total > rows.length && (
          <Text size="xs" c="dimmed">
            Showing the {formatInteger(rows.length)} most recently declared of{" "}
            {formatInteger(summary.total)} wars. The record above counts them
            all.
          </Text>
        )}
      </Stack>
    </Stack>
  );
}

export type { WarRow };
