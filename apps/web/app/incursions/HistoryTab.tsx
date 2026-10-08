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
  IncursionEventKind,
  IncursionEventRow,
  IncursionRow,
  IncursionsData,
  IncursionSource,
  IncursionStateEventTuple,
  SovereigntyHolder,
} from "./types";
import { DataTable } from "~/components/DataTable";
import { mergeLookups, useIncursionHistory } from "./history";
import { formatDuration } from "./math";
import {
  ConstellationLink,
  EveTime,
  percent,
  SectionTitle,
  SovereigntyHolderLabel,
  STATE_LABEL,
  StateBadge,
  SystemLink,
  useNames,
} from "./parts";

const EVENT_LABEL: Record<IncursionEventKind, string> = {
  appeared: "Appeared",
  resumed: "Listed again",
  state_changed: "State",
  influence_changed: "Influence",
  boss_appeared: "Boss spawned",
  boss_disappeared: "Boss gone",
  staging_system_changed: "Staging moved",
  system_added: "System infested",
  system_removed: "System cleared",
  ended: "Ended",
};

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

const SOURCE_LABEL: Record<IncursionSource, string> = {
  esi: "JitaSpace",
  eve_incursions_de: "eve-incursions.de",
  everef: "EVE Ref",
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

const holderName = (holder: SovereigntyHolder | undefined, names: Names) => {
  if (holder?.allianceId != null) return names.alliance(holder.allianceId);
  if (holder?.factionId != null) return names.faction(holder.factionId);
  return null;
};

function EventDetail({
  event,
  names,
}: Readonly<{ event: IncursionEventRow; names: Names }>) {
  switch (event.kind) {
    case "appeared":
      return (
        <Text span size="sm">
          {event.state && STATE_LABEL[event.state]}
          {event.influence !== null &&
            `, ${percent(event.influence)} influence`}
          {event.hasBoss && ", boss present"}
        </Text>
      );
    case "resumed":
      return (
        <Text span size="sm" c="dimmed">
          Listed by ESI again after a poll missed it
        </Text>
      );
    case "state_changed":
      return (
        <Group gap={6} wrap="nowrap">
          {event.previousState && <StateBadge state={event.previousState} />}
          <Text span size="sm">
            →
          </Text>
          {event.state && <StateBadge state={event.state} />}
        </Group>
      );
    case "influence_changed":
      return (
        <Text span size="sm">
          {event.previousInfluence !== null && percent(event.previousInfluence)}{" "}
          → {event.influence !== null && percent(event.influence)}
        </Text>
      );
    case "boss_appeared":
    case "boss_disappeared":
      return null;
    case "staging_system_changed":
      return (
        <Group gap={6} wrap="nowrap">
          {event.previousStagingSolarSystemId !== null && (
            <SystemLink
              solarSystemId={event.previousStagingSolarSystemId}
              names={names}
            />
          )}
          <Text span size="sm">
            →
          </Text>
          {event.stagingSolarSystemId !== null && (
            <SystemLink
              solarSystemId={event.stagingSolarSystemId}
              names={names}
            />
          )}
        </Group>
      );
    case "system_added":
    case "system_removed":
      return event.solarSystemId === null ? null : (
        <SystemLink solarSystemId={event.solarSystemId} names={names} />
      );
    case "ended":
      return (
        <Text span size="sm">
          Last seen {event.state && STATE_LABEL[event.state].toLowerCase()}
          {event.influence !== null &&
            ` at ${percent(event.influence)} influence`}
        </Text>
      );
  }
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

interface EventTableRow extends IncursionEventRow {
  constellationId: number | null;
  constellationName: string;
  kindLabel: string;
}

interface HistoryTableRow extends IncursionRow {
  constellationName: string;
  regionName: string | null;
  sovereigntyName: string | null;
  sourceLabel: string;
  stateLabel: string;
  durationMs: number;
}

/** The change list's columns; they name things through `names`. */
const eventColumnsFor = (names: Names): DataTableColumn<EventTableRow>[] => [
  {
    id: "observedAt",
    header: "Time (EVE)",
    accessor: "observedAt",
    sortable: true,
    width: 150,
    cell: (row) => <EveTime iso={row.observedAt} />,
  },
  {
    id: "constellation",
    header: "Constellation",
    accessor: "constellationName",
    sortable: true,
    filter: { type: "multi-select" },
    cell: (row) =>
      row.constellationId === null ? (
        row.constellationName
      ) : (
        <ConstellationLink
          constellationId={row.constellationId}
          names={names}
        />
      ),
  },
  {
    id: "kind",
    header: "Change",
    accessor: "kindLabel",
    sortable: true,
    filter: { type: "multi-select" },
  },
  {
    id: "detail",
    header: "Detail",
    cell: (row) => <EventDetail event={row} names={names} />,
  },
];

/** The past incursions' columns. */
const historyColumnsFor = (
  names: Names,
  data: IncursionsData,
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
    id: "sovereignty",
    header: "Sov. holder",
    accessor: "sovereigntyName",
    sortable: true,
    filter: { type: "multi-select" },
    cell: (row) => (
      <SovereigntyHolderLabel
        holder={sovereigntyOf(row, data)}
        names={names}
        size="xs"
      />
    ),
  },
  {
    id: "systems",
    header: "Systems",
    // Imported incursions never recorded their systems.
    accessor: (row) =>
      row.source === "esi" ? row.infestedSolarSystemIds.length : null,
    sortable: true,
    align: "right",
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
  {
    id: "state",
    header: "Last state",
    accessor: "stateLabel",
    sortable: true,
    filter: { type: "multi-select" },
    cell: (row) => <StateBadge state={row.state} />,
  },
  {
    id: "source",
    header: "Source",
    accessor: "sourceLabel",
    sortable: true,
    filter: { type: "multi-select" },
  },
];

export function HistoryTab({ data }: Readonly<{ data: IncursionsData }>) {
  const archive = useIncursionHistory();
  const names = useNames(
    useMemo(() => mergeLookups(data, archive.data), [data, archive.data]),
  );
  const byId = useMemo(
    () =>
      new Map(
        [
          ...(archive.data?.incursions ?? []),
          ...data.eventIncursions,
          ...data.incursions,
        ].map((i) => [i.incursionId, i]),
      ),
    [data.incursions, data.eventIncursions, archive.data],
  );

  const history = useMemo<HistoryTableRow[]>(
    () =>
      (archive.data?.incursions ?? [])
        .filter((i) => i.endedAt !== null)
        .map((i) => {
          const holder = sovereigntyOf(i, data);
          return {
            ...i,
            constellationName: names.constellation(i.constellationId),
            regionName: names.region(i.constellationId)?.name ?? null,
            sovereigntyName: holderName(holder, names),
            sourceLabel: SOURCE_LABEL[i.source],
            stateLabel: STATE_LABEL[i.state],
            durationMs:
              Date.parse(i.endedAt ?? i.lastSeenAt) - Date.parse(i.firstSeenAt),
          };
        }),
    [archive.data, data, names],
  );

  const events = useMemo<EventTableRow[]>(
    () =>
      data.events.map((event) => {
        const constellationId =
          byId.get(event.incursionId)?.constellationId ?? null;
        return {
          ...event,
          constellationId,
          constellationName:
            constellationId === null
              ? `Incursion ${event.incursionId}`
              : names.constellation(constellationId),
          kindLabel: EVENT_LABEL[event.kind],
        };
      }),
    [data.events, byId, names],
  );

  const eventColumns = useMemo(() => eventColumnsFor(names), [names]);

  const historyColumns = useMemo(
    () => historyColumnsFor(names, data),
    [names, data],
  );

  return (
    <Stack gap="lg">
      <SectionTitle sub="Every incursion appearing, changing state and ending, most recent first. The sovereignty holder is the staging system's when the incursion appeared.">
        Spawn history
      </SectionTitle>
      <ArchiveState failed={archive.isError} loading={archive.isPending}>
        <SpawnHistory
          data={data}
          stateEvents={archive.data?.stateEvents ?? []}
          names={names}
          byId={byId}
        />
      </ArchiveState>

      <SectionTitle sub="Every change between one poll and the next — influence, boss, systems — most recent first.">
        All changes
      </SectionTitle>
      <DataTable
        data={events}
        columns={eventColumns}
        rowId={(row) => row.eventId}
        withPagination
        defaultPageSize={25}
        initialSort={{ columnId: "observedAt", direction: "desc" }}
        verticalSpacing="xs"
        highlightOnHover
        striped
      />

      <SectionTitle sub="Before 2023-10 they come from eve-incursions.de, which recorded states and influence but not staging or infested systems. * Already running when tracking began: the first-seen time is not when it spawned.">
        Past incursions
      </SectionTitle>
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
    </Stack>
  );
}
