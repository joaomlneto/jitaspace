"use client";

import { useMemo } from "react";
import {
  Avatar,
  Card,
  Code,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { EveEntityName } from "@jitaspace/eve-components";
import { CharacterAvatar } from "@jitaspace/ui";

import type { MilitaryCampaign, MilitaryCampaignObjective } from "./esi";
import type { Participation } from "./parts";
import { DataTable } from "~/components/DataTable";
import { formatDateTime, formatInteger } from "~/lib/format";
import {
  campaignAnchorId,
  formatRunDuration,
  runDurationMs,
  shortId,
  Stat,
  STATE_ORDER,
  StateBadge,
} from "./parts";

interface ObjectiveRow extends MilitaryCampaignObjective {
  /** What the signed-in characters did in this objective. */
  mine: Participation[];
  durationMs: number | null;
}

/** Avatars of the characters in `participations`, each with what it gave. */
export function ParticipantAvatars({
  participations,
  size = 24,
}: Readonly<{ participations: Participation[]; size?: number }>) {
  // One avatar per character, summing what each gave across the rows.
  const byCharacter = new Map<
    number,
    { contributed: number; committed: boolean }
  >();
  for (const row of participations) {
    const entry = byCharacter.get(row.subjectId) ?? {
      contributed: 0,
      committed: false,
    };
    entry.contributed += row.contributed;
    entry.committed ||= row.is_committed;
    byCharacter.set(row.subjectId, entry);
  }

  return (
    <Avatar.Group spacing="xs">
      {[...byCharacter].map(([characterId, { contributed, committed }]) => (
        <Tooltip
          key={characterId}
          label={
            <Stack gap={0}>
              <EveEntityName entityId={characterId} fw={600} size="sm" />
              <Text size="xs">
                Contributed {formatInteger(contributed)}
                {committed ? " · committed" : ""}
              </Text>
            </Stack>
          }
        >
          <CharacterAvatar characterId={characterId} size={size} />
        </Tooltip>
      ))}
    </Avatar.Group>
  );
}

function buildColumns(
  readAt: string,
  withMine: boolean,
): DataTableColumn<ObjectiveRow>[] {
  const columns: DataTableColumn<ObjectiveRow>[] = [
    {
      id: "objective",
      header: "Objective",
      accessor: "id",
      enableHiding: false,
      cell: (row) => (
        <Tooltip label={row.id}>
          <Code>{shortId(row.id)}</Code>
        </Tooltip>
      ),
    },
    {
      id: "state",
      header: "State",
      accessor: "state",
      sortable: true,
      sortAccessor: (row) => STATE_ORDER[row.state],
      filter: { type: "select" },
      cell: (row) => <StateBadge state={row.state} size="xs" />,
    },
    {
      id: "progress",
      header: "Progress",
      accessor: "progress",
      sortable: true,
      filter: { type: "range", min: 0 },
      align: "right",
      cell: (row) => formatInteger(row.progress),
    },
    {
      id: "committed",
      header: "Committed",
      accessor: "participantsCommitted",
      sortable: true,
      filter: { type: "range", min: 0 },
      align: "right",
      cell: (row) => formatInteger(row.participantsCommitted),
    },
    {
      id: "contributors",
      header: "Contributors",
      accessor: "participantsContributors",
      sortable: true,
      filter: { type: "range", min: 0 },
      align: "right",
      cell: (row) => formatInteger(row.participantsContributors),
    },
    {
      id: "participants",
      header: "Participants",
      accessor: "participantsTotal",
      sortable: true,
      filter: { type: "range", min: 0 },
      align: "right",
      cell: (row) => formatInteger(row.participantsTotal),
    },
    {
      id: "started",
      header: "Started",
      accessor: "started",
      sortable: true,
      filter: { type: "date-range" },
      cell: (row) => (row.started ? formatDateTime(row.started) : "—"),
    },
    {
      id: "finished",
      header: "Finished",
      accessor: "finished",
      sortable: true,
      filter: { type: "date-range" },
      cell: (row) => (row.finished ? formatDateTime(row.finished) : "—"),
    },
    {
      id: "duration",
      header: "Duration",
      accessor: "durationMs",
      sortable: true,
      align: "right",
      cell: (row) => formatRunDuration(row.started, row.finished, readAt),
    },
  ];

  if (withMine) {
    columns.push({
      id: "mine",
      header: "Your characters",
      accessor: (row) => row.mine.reduce((sum, p) => sum + p.contributed, 0),
      sortable: true,
      filter: { type: "boolean" },
      filterAccessor: (row) => row.mine.length > 0,
      cell: (row) =>
        row.mine.length > 0 ? (
          <ParticipantAvatars participations={row.mine} size={22} />
        ) : null,
    });
  }

  return columns;
}

export function CampaignCard({
  campaign,
  readAt,
  participations,
  withMine,
}: Readonly<{
  campaign: MilitaryCampaign;
  readAt: string;
  /** The signed-in characters' participation in this campaign's objectives. */
  participations: Participation[];
  /** Whether any character is signed in, so the "Your characters" column shows. */
  withMine: boolean;
}>) {
  const rows = useMemo<ObjectiveRow[]>(() => {
    const byObjective = new Map<string, Participation[]>();
    for (const row of participations) {
      byObjective.set(row.id, [...(byObjective.get(row.id) ?? []), row]);
    }
    return campaign.objectives.map((objective) => ({
      ...objective,
      mine: byObjective.get(objective.id) ?? [],
      durationMs: runDurationMs(objective.started, objective.finished, readAt),
    }));
  }, [campaign.objectives, participations, readAt]);

  const columns = useMemo(
    () => buildColumns(readAt, withMine),
    [readAt, withMine],
  );

  const counts = useMemo(() => {
    const byState = { Active: 0, Completed: 0, Expired: 0, Unspecified: 0 };
    for (const objective of campaign.objectives) byState[objective.state] += 1;
    return byState;
  }, [campaign.objectives]);

  const contributors = useMemo(
    () => new Set(participations.map((row) => row.subjectId)).size,
    [participations],
  );

  return (
    <Card
      withBorder
      radius="md"
      padding="lg"
      id={campaignAnchorId(campaign.id)}
    >
      <Stack>
        <Group justify="space-between" wrap="wrap">
          <Group gap="sm">
            <Title order={3}>
              <Tooltip label={campaign.id}>
                <span>Campaign {shortId(campaign.id)}</span>
              </Tooltip>
            </Title>
            <StateBadge state={campaign.state} size="md" />
          </Group>
          {contributors > 0 && (
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                Your characters
              </Text>
              <ParticipantAvatars participations={participations} />
            </Group>
          )}
        </Group>

        <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }}>
          <Stat label="Progress">{formatInteger(campaign.progress)}</Stat>
          <Stat label="Objectives">
            {formatInteger(campaign.objectives.length)}
          </Stat>
          <Stat label="Completed · Expired">
            {formatInteger(counts.Completed)} · {formatInteger(counts.Expired)}
          </Stat>
          <Stat label="Active objectives">{formatInteger(counts.Active)}</Stat>
          <Stat label="Started">
            {campaign.started ? formatDateTime(campaign.started) : "—"}
          </Stat>
          <Stat label={campaign.finished ? "Finished" : "Running for"}>
            {campaign.finished
              ? formatDateTime(campaign.finished)
              : formatRunDuration(campaign.started, null, readAt)}
          </Stat>
        </SimpleGrid>

        <DataTable
          data={rows}
          columns={columns}
          rowId={(row) => row.id}
          initialSort={{ columnId: "started", direction: "desc" }}
          withGlobalFilter
          withColumnVisibility
          withPagination
          defaultPageSize={50}
          verticalSpacing="xs"
          highlightOnHover
          striped
          emptyText="ESI lists no objectives for this campaign."
        />
      </Stack>
    </Card>
  );
}
