"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Anchor, Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { IncursionsIcon, WindowInfoIcon } from "@jitaspace/eve-icons";

import type { SystemsById } from "./parts";
import type {
  ConstellationIncursion,
  ConstellationIncursions,
  ConstellationSystem,
} from "./types";
import { formatDuration } from "~/app/incursions/math";
import {
  BossBadge,
  EveTime,
  percent,
  StateBadge,
} from "~/app/incursions/parts";
import { DataTable } from "~/components/DataTable";
import { SectionHeading, StatCard } from "~/components/EntityPage";
import { formatDate, formatInteger } from "~/lib/format";
import { SystemLink } from "./parts";

const ROLES = [
  { role: "vanguard", label: "Vanguard" },
  { role: "assault", label: "Assault" },
  { role: "headquarters", label: "Headquarters" },
] as const;

/** The staging system the latest incursion used, if any recorded one. */
export const latestStaging = (incursions: readonly ConstellationIncursion[]) =>
  incursions.find((incursion) => incursion.stagingSolarSystemId !== null)
    ?.stagingSolarSystemId ?? null;

/** Whether the tab has anything to show. */
export const hasIncursionData = (
  systems: readonly ConstellationSystem[],
  incursions: ConstellationIncursions,
) =>
  incursions.incursions.length > 0 ||
  systems.some((system) => system.siteRole !== null);

interface IncursionTableRow extends ConstellationIncursion {
  durationMs: number;
  stagingName: string | null;
}

const columnsFor = (
  systems: SystemsById,
): DataTableColumn<IncursionTableRow>[] => [
  {
    id: "firstSeenAt",
    header: "Started (EVE)",
    accessor: "firstSeenAt",
    sortable: true,
    filter: { type: "date-range" },
    cell: (row) => <EveTime iso={row.firstSeenAt} />,
  },
  {
    id: "endedAt",
    header: "Ended (EVE)",
    accessor: "endedAt",
    sortable: true,
    cell: (row) =>
      row.endedAt ? (
        <EveTime iso={row.endedAt} />
      ) : (
        <StateBadge state={row.state} />
      ),
  },
  {
    id: "duration",
    header: "Duration",
    accessor: "durationMs",
    sortable: true,
    align: "right",
    cell: (row) => formatDuration(row.durationMs),
  },
  {
    id: "staging",
    header: "Staging",
    accessor: "stagingName",
    sortable: true,
    filter: { type: "select" },
    cell: (row) =>
      row.stagingSolarSystemId === null ? (
        <Text span size="sm" c="dimmed">
          —
        </Text>
      ) : (
        <SystemLink
          solarSystemId={row.stagingSolarSystemId}
          systems={systems}
        />
      ),
  },
  {
    id: "hasBoss",
    header: "Boss",
    accessor: "hasBoss",
    sortable: true,
    filter: { type: "boolean" },
    cell: (row) => {
      if (row.hasBoss === null) {
        return (
          <Text span size="sm" c="dimmed">
            —
          </Text>
        );
      }
      return row.hasBoss ? <BossBadge /> : null;
    },
  },
];

/** The constellation's incursions: the one running now, its layout, and every past one. */
export function IncursionsPanel({
  systems,
  systemsById,
  incursions,
}: Readonly<{
  systems: readonly ConstellationSystem[];
  systemsById: SystemsById;
  incursions: ConstellationIncursions;
}>) {
  const readAt = Date.parse(incursions.readAt);
  const active = incursions.incursions.find((i) => i.endedAt === null);
  const staging = latestStaging(incursions.incursions);
  const isMapped = systems.some((system) => system.siteRole !== null);

  const rows = useMemo<IncursionTableRow[]>(
    () =>
      incursions.incursions.map((incursion) => ({
        ...incursion,
        durationMs:
          (incursion.endedAt === null
            ? readAt
            : Date.parse(incursion.endedAt)) -
          Date.parse(incursion.firstSeenAt),
        stagingName:
          incursion.stagingSolarSystemId === null
            ? null
            : (systemsById.get(incursion.stagingSolarSystemId)?.name ?? null),
      })),
    [incursions.incursions, readAt, systemsById],
  );
  const columns = useMemo(() => columnsFor(systemsById), [systemsById]);
  const ended = rows
    .filter((row) => row.endedAt !== null)
    .map((row) => row.durationMs)
    .sort((a, b) => a - b);
  const medianDuration =
    ended.length === 0 ? null : ended[Math.floor(ended.length / 2)];
  const oldest = incursions.incursions.at(-1);
  const latest = incursions.incursions[0];

  return (
    <Stack gap="lg">
      {active && (
        <Paper withBorder radius="md" p="md">
          <Stack gap="xs">
            <Group gap="sm">
              <Text fw={600} c="bright">
                Incursion in progress
              </Text>
              <StateBadge state={active.state} />
              {active.hasBoss && <BossBadge />}
            </Group>
            <Text size="sm" c="dimmed">
              Spawned <EveTime iso={active.firstSeenAt} />
              {active.influence !== null &&
                `, influence ${percent(active.influence)}`}
              .{" "}
              <Anchor component={Link} href="/incursions" size="sm">
                Follow it live on the incursions page
              </Anchor>
            </Text>
          </Stack>
        </Paper>
      )}

      <Stack gap="sm">
        <SectionHeading icon={<IncursionsIcon size={18} alt="" />}>
          Site layout
        </SectionHeading>
        {isMapped ? (
          <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
            <StatCard
              label="Staging"
              value={
                staging === null ? (
                  <Text span c="dimmed">
                    Not recorded
                  </Text>
                ) : (
                  <SystemLink solarSystemId={staging} systems={systemsById} />
                )
              }
            />
            {ROLES.map(({ role, label }) => {
              const ids = systems
                .filter((system) => system.siteRole === role)
                .map((system) => system.solarSystemId);
              return (
                <StatCard
                  key={role}
                  label={`${label} (${ids.length})`}
                  value={
                    ids.length === 0 ? (
                      <Text span c="dimmed">
                        None
                      </Text>
                    ) : (
                      <Stack gap={4}>
                        {ids.map((id) => (
                          <SystemLink
                            key={id}
                            solarSystemId={id}
                            systems={systemsById}
                          />
                        ))}
                      </Stack>
                    )
                  }
                />
              );
            })}
          </SimpleGrid>
        ) : (
          <Text size="sm" c="dimmed">
            Where this constellation&apos;s sites spawn has not been mapped.
          </Text>
        )}
        <Text size="xs" c="dimmed">
          CCP does not publish where each site spawns; see the{" "}
          <Anchor component={Link} href="/incursions#layouts" size="xs">
            layouts of every constellation
          </Anchor>{" "}
          and where they come from.
        </Text>
      </Stack>

      {latest && oldest && (
        <Stack gap="sm">
          <SectionHeading icon={<WindowInfoIcon size={18} alt="" />}>
            Every incursion
          </SectionHeading>
          <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
            <StatCard
              label="Incursions"
              value={formatInteger(incursions.incursions.length)}
              sub={`Since ${formatDate(oldest.firstSeenAt)}`}
            />
            <StatCard label="Latest" value={formatDate(latest.firstSeenAt)} />
            {medianDuration !== undefined && medianDuration !== null && (
              <StatCard
                label="Typical length"
                value={formatDuration(medianDuration)}
                sub="Median of those that ended"
              />
            )}
            <StatCard
              label="Reached the boss"
              value={formatInteger(rows.filter((row) => row.hasBoss).length)}
              sub="Where the source recorded it"
            />
          </SimpleGrid>
          <DataTable
            data={rows}
            columns={columns}
            rowId={(row) => row.incursionId}
            withGlobalFilter
            withColumnVisibility
            withPagination
            defaultPageSize={10}
            initialSort={{ columnId: "firstSeenAt", direction: "desc" }}
            verticalSpacing="xs"
            withTableBorder
            highlightOnHover
            striped
          />
        </Stack>
      )}
    </Stack>
  );
}
