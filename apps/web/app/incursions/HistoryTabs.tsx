"use client";

import type { ReactNode } from "react";
import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Anchor,
  Button,
  Group,
  Loader,
  Paper,
  Stack,
  Table,
  Text,
} from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { DateHoverCard } from "@jitaspace/ui";

import type { Names } from "./parts";
import type {
  IncursionRow,
  IncursionsData,
  IncursionStateEventTuple,
  SovereigntyHolder,
} from "./types";
import { DataTable } from "~/components/DataTable";
import { mergeLookups, useIncursionHistory } from "./history";
import { formatDuration } from "./math";
import {
  ConstellationLink,
  EveTime,
  SovereigntyHolderLabel,
  StateBadge,
  SystemLink,
  useNames,
} from "./parts";

/** How many spawn-history rows show at first, and per "show more". */
const SPAWN_HISTORY_PAGE = 50;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * "Tue, 6 Oct 2026", in UTC like every time on the page. Built by hand: the
 * server's and the browser's `toLocaleDateString` can disagree, and the
 * hydration would then too.
 */
const eveDate = (iso: string) => {
  const date = new Date(iso);
  return `${WEEKDAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

/** Who held the staging system when the incursion appeared, or now. */
const sovereigntyOf = (
  incursion: IncursionRow | undefined,
  data: IncursionsData,
): SovereigntyHolder | undefined => {
  if (!incursion) return undefined;
  if (
    incursion.stagingSovereigntyAllianceId !== null ||
    incursion.stagingSovereigntyFactionId !== null
  ) {
    return {
      allianceId: incursion.stagingSovereigntyAllianceId,
      factionId: incursion.stagingSovereigntyFactionId,
    };
  }
  return incursion.stagingSolarSystemId === null
    ? undefined
    : data.currentSovereignty[incursion.stagingSolarSystemId];
};

/** A staging system, or a dash for an imported incursion without one. */
function StagingCell({
  solarSystemId,
  names,
}: Readonly<{ solarSystemId: number | null; names: Names }>) {
  return solarSystemId === null ? (
    <Text span size="sm" c="dimmed">
      —
    </Text>
  ) : (
    <SystemLink solarSystemId={solarSystemId} names={names} />
  );
}

/** Appearances, state changes and ends, grouped by day, as players scan them. */
function SpawnHistory({
  data,
  stateEvents,
  names,
  byId,
}: Readonly<{
  data: IncursionsData;
  stateEvents: readonly IncursionStateEventTuple[];
  names: Names;
  byId: ReadonlyMap<number, IncursionRow>;
}>) {
  const [shown, setShown] = useState(SPAWN_HISTORY_PAGE);
  const events = stateEvents
    .slice(0, shown)
    .map(([eventId, incursionId, observedAt, kind, state]) => ({
      eventId,
      incursionId,
      observedAt,
      kind,
      state,
    }));
  if (stateEvents.length === 0) {
    return (
      <Paper withBorder radius="md" p="lg">
        <Text c="dimmed">Nothing recorded yet.</Text>
      </Paper>
    );
  }
  return (
    <Stack gap="xs">
      <Table.ScrollContainer minWidth={720}>
        <Table verticalSpacing={6} highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Time (EVE)</Table.Th>
              <Table.Th>Constellation</Table.Th>
              <Table.Th>Region</Table.Th>
              <Table.Th>Staging system</Table.Th>
              <Table.Th>State</Table.Th>
              <Table.Th>Sov. holder</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {events.map((event, index) => {
              const incursion = byId.get(event.incursionId);
              const date = eveDate(event.observedAt);
              const region = incursion
                ? names.region(incursion.constellationId)
                : undefined;
              const state =
                event.kind === "ended" ? "ended" : (event.state ?? undefined);
              return (
                <Fragment key={event.eventId}>
                  {(index === 0 ||
                    eveDate(events[index - 1]?.observedAt ?? "") !== date) && (
                    <Table.Tr bg="var(--mantine-color-default-hover)">
                      <Table.Td colSpan={6} py={4}>
                        <Text size="xs" fw={700} c="dimmed">
                          {date}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                  <Table.Tr>
                    <Table.Td>
                      <DateHoverCard date={new Date(event.observedAt)}>
                        <Text span size="sm">
                          {event.observedAt.slice(11, 16)}
                        </Text>
                      </DateHoverCard>
                    </Table.Td>
                    <Table.Td>
                      {incursion ? (
                        <ConstellationLink
                          constellationId={incursion.constellationId}
                          names={names}
                          fw={600}
                        />
                      ) : (
                        `Incursion ${event.incursionId}`
                      )}
                    </Table.Td>
                    <Table.Td>
                      {region && (
                        <Anchor
                          component={Link}
                          href={`/region/${region.regionId}`}
                          size="sm"
                        >
                          {region.name}
                        </Anchor>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {incursion && (
                        <StagingCell
                          solarSystemId={incursion.stagingSolarSystemId}
                          names={names}
                        />
                      )}
                    </Table.Td>
                    <Table.Td>{state && <StateBadge state={state} />}</Table.Td>
                    <Table.Td>
                      <SovereigntyHolderLabel
                        holder={sovereigntyOf(incursion, data)}
                        names={names}
                        size="xs"
                      />
                    </Table.Td>
                  </Table.Tr>
                </Fragment>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {shown < stateEvents.length && (
        <Group justify="center">
          <Button
            variant="light"
            size="xs"
            onClick={() => setShown((n) => n + SPAWN_HISTORY_PAGE)}
          >
            Show more
          </Button>
        </Group>
      )}
    </Stack>
  );
}

/** The history while it loads, if it failed, or once it is here. */
function ArchiveState({
  failed,
  loading,
  children,
}: Readonly<{ failed: boolean; loading: boolean; children: ReactNode }>) {
  if (failed) {
    return (
      <Alert color="red" variant="light">
        The history could not be loaded. Try again in a moment.
      </Alert>
    );
  }
  if (loading) {
    return (
      <Group justify="center" p="lg">
        <Loader size="sm" />
      </Group>
    );
  }
  return children;
}

interface HistoryTableRow extends IncursionRow {
  constellationName: string;
  regionName: string | null;
  durationMs: number;
}

/** The past incursions' columns. */
const historyColumnsFor = (
  names: Names,
): DataTableColumn<HistoryTableRow>[] => [
  {
    id: "constellation",
    header: "Constellation",
    accessor: "constellationName",
    sortable: true,
    filter: { type: "text" },
    cell: (row) => (
      <ConstellationLink constellationId={row.constellationId} names={names} />
    ),
  },
  {
    id: "region",
    header: "Region",
    accessor: "regionName",
    sortable: true,
    cell: (row) => {
      const region = names.region(row.constellationId);
      return region ? (
        <Anchor component={Link} href={`/region/${region.regionId}`} size="sm">
          {region.name}
        </Anchor>
      ) : null;
    },
    filter: { type: "multi-select" },
  },
  {
    id: "staging",
    header: "Staging",
    cell: (row) => (
      <StagingCell solarSystemId={row.stagingSolarSystemId} names={names} />
    ),
  },
  {
    id: "firstSeenAt",
    header: "First seen (EVE)",
    accessor: "firstSeenAt",
    sortable: true,
    cell: (row) => (
      <Text
        span
        size="sm"
        c={row.isObservedFromStart ? undefined : "dimmed"}
        style={{ whiteSpace: "nowrap" }}
      >
        <EveTime iso={row.firstSeenAt} />
        {!row.isObservedFromStart && " *"}
      </Text>
    ),
  },
  {
    id: "endedAt",
    header: "Ended (EVE)",
    accessor: "endedAt",
    sortable: true,
    cell: (row) => (row.endedAt ? <EveTime iso={row.endedAt} /> : null),
  },
  {
    id: "duration",
    header: "Duration",
    accessor: "durationMs",
    sortable: true,
    align: "right",
    cell: (row) => formatDuration(row.durationMs),
  },
];

/** The archive, and the names of everything it and the page refer to. */
function useArchive(data: IncursionsData) {
  const archive = useIncursionHistory();
  const names = useNames(
    useMemo(() => mergeLookups(data, archive.data), [data, archive.data]),
  );
  return { archive, names };
}

/** Appearances, state changes and ends, most recent first, by day. */
export function TimelineTab({ data }: Readonly<{ data: IncursionsData }>) {
  const { archive, names } = useArchive(data);
  const byId = useMemo(
    () =>
      new Map(
        [...(archive.data?.incursions ?? []), ...data.incursions].map((i) => [
          i.incursionId,
          i,
        ]),
      ),
    [data.incursions, archive.data],
  );
  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Every incursion appearing, changing state and ending, most recent first.
        The sovereignty holder is the staging system&apos;s when the incursion
        appeared.
      </Text>
      <ArchiveState failed={archive.isError} loading={archive.isPending}>
        <SpawnHistory
          data={data}
          stateEvents={archive.data?.stateEvents ?? []}
          names={names}
          byId={byId}
        />
      </ArchiveState>
    </Stack>
  );
}

/** Every incursion that has ended, ours and imported, as a table. */
export function ArchiveTab({ data }: Readonly<{ data: IncursionsData }>) {
  const { archive, names } = useArchive(data);
  const history = useMemo<HistoryTableRow[]>(
    () =>
      (archive.data?.incursions ?? [])
        .filter((i) => i.endedAt !== null)
        .map((i) => ({
          ...i,
          constellationName: names.constellation(i.constellationId),
          regionName: names.region(i.constellationId)?.name ?? null,
          durationMs:
            Date.parse(i.endedAt ?? i.lastSeenAt) - Date.parse(i.firstSeenAt),
        })),
    [archive.data, names],
  );
  const historyColumns = useMemo(() => historyColumnsFor(names), [names]);
  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Every incursion that has ended, back to 2015. Most before 2023-10 come
        from eve-incursions.de, which did not record the staging system. *
        Already running when tracking began: the first-seen time is not when it
        spawned.
      </Text>
      <ArchiveState failed={archive.isError} loading={false}>
        <DataTable
          data={history}
          isLoading={archive.isPending}
          columns={historyColumns}
          rowId={(row) => row.incursionId}
          withGlobalFilter
          withPagination
          defaultPageSize={25}
          initialSort={{ columnId: "endedAt", direction: "desc" }}
          verticalSpacing="xs"
          highlightOnHover
          striped
        />
      </ArchiveState>
    </Stack>
  );
}
