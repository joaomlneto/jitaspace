"use client";

import { useMemo } from "react";
import {
  Avatar,
  Card,
  Code,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { EveEntityName } from "@jitaspace/eve-components";
import { CharacterAvatar, FactionAvatar } from "@jitaspace/ui";

import type { MilitaryCampaignsSdeInfo } from "./data";
import type { MilitaryCampaign, MilitaryCampaignObjective } from "./esi";
import type { Participation } from "./parts";
import { FactionAnchor } from "~/components/Anchor";
import { DataTable } from "~/components/DataTable";
import { MailMessageViewer } from "~/components/EveMail";
import { formatDateTime, formatInteger, formatPercent } from "~/lib/format";
import {
  campaignAnchorId,
  campaignTitle,
  contributionMethodLabel,
  formatRunDuration,
  objectiveTitle,
  runDurationMs,
  Stat,
  STATE_ORDER,
  StateBadge,
} from "./parts";

interface ObjectiveRow extends MilitaryCampaignObjective {
  title: string;
  subtitle: string | null;
  /** In the objective's own unit; see MilitaryCampaignObjectiveSdeInfo. */
  targetProgress: number | null;
  /** progress / target, when the SDE gives a target. */
  completion: number | null;
  method: string | null;
  /** What the signed-in characters did in this objective. */
  mine: Participation[];
  durationMs: number | null;
}

/**
 * Avatars of the characters in `participations`.
 *
 * Contributions are summed only within one objective (`sumContributions`):
 * each objective counts in its own unit — missions for one, raw ISK for
 * another — so a total across objectives would add missions to ISK.
 */
export function ParticipantAvatars({
  participations,
  size = 24,
  sumContributions = false,
}: Readonly<{
  participations: Participation[];
  size?: number;
  sumContributions?: boolean;
}>) {
  const byCharacter = new Map<
    number,
    { objectives: number; contributed: number; committed: boolean }
  >();
  for (const row of participations) {
    const entry = byCharacter.get(row.subjectId) ?? {
      objectives: 0,
      contributed: 0,
      committed: false,
    };
    entry.objectives += 1;
    entry.contributed += row.contributed;
    entry.committed ||= row.is_committed;
    byCharacter.set(row.subjectId, entry);
  }

  return (
    <Avatar.Group spacing="xs">
      {[...byCharacter].map(([characterId, entry]) => (
        <Tooltip
          key={characterId}
          label={
            <Stack gap={0}>
              <EveEntityName entityId={characterId} fw={600} size="sm" />
              <Text size="xs">
                {sumContributions
                  ? `Contributed ${formatInteger(entry.contributed)}`
                  : `Joined ${entry.objectives === 1 ? "1 objective" : `${formatInteger(entry.objectives)} objectives`}`}
                {entry.committed ? " · committed" : ""}
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
      accessor: "title",
      sortable: true,
      enableHiding: false,
      cell: (row) => (
        <Tooltip
          multiline
          maw={360}
          label={
            <Stack gap={2}>
              {row.subtitle && <Text size="xs">{row.subtitle}</Text>}
              <Code>{row.id}</Code>
            </Stack>
          }
        >
          <Text size="sm" span>
            {row.title}
          </Text>
        </Tooltip>
      ),
    },
    {
      id: "method",
      header: "Activity",
      accessor: "method",
      sortable: true,
      filter: { type: "select" },
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
      cell: (row) =>
        row.targetProgress === null
          ? formatInteger(row.progress)
          : `${formatInteger(row.progress)} / ${formatInteger(row.targetProgress)}`,
    },
    {
      id: "completion",
      header: "Done",
      accessor: "completion",
      sortable: true,
      align: "right",
      cell: (row) =>
        row.completion === null ? "—" : formatPercent(row.completion),
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
          <ParticipantAvatars
            participations={row.mine}
            size={22}
            sumContributions
          />
        ) : null,
    });
  }

  return columns;
}

export function CampaignCard({
  campaign,
  readAt,
  sdeInfo,
  participations,
  withMine,
}: Readonly<{
  campaign: MilitaryCampaign;
  readAt: string;
  sdeInfo: MilitaryCampaignsSdeInfo;
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
    return campaign.objectives.map((objective) => {
      const sde = sdeInfo.objectives[objective.id];
      const targetProgress = sde?.targetProgress ?? null;
      return {
        ...objective,
        title: objectiveTitle(objective.id, sdeInfo),
        subtitle: sde?.subtitle ?? null,
        targetProgress,
        completion: targetProgress ? objective.progress / targetProgress : null,
        method: contributionMethodLabel(sde?.contributionMethodName ?? null),
        mine: byObjective.get(objective.id) ?? [],
        durationMs: runDurationMs(
          objective.started,
          objective.finished,
          readAt,
        ),
      };
    });
  }, [campaign.objectives, participations, readAt, sdeInfo]);

  const sde = sdeInfo.campaigns[campaign.id];

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
          <Stack gap={4}>
            <Group gap="sm">
              <Title order={3}>
                <Tooltip label={campaign.id}>
                  <span>{campaignTitle(campaign.id, sdeInfo)}</span>
                </Tooltip>
              </Title>
              <StateBadge state={campaign.state} size="md" />
            </Group>
            {sde?.issuerFactionId != null && (
              <Group gap="xs">
                <FactionAvatar factionId={sde.issuerFactionId} size={20} />
                <FactionAnchor factionId={sde.issuerFactionId} size="sm">
                  {sde.issuerFactionName ?? sde.issuerFactionId}
                </FactionAnchor>
              </Group>
            )}
            {sde?.subtitle && (
              // EVE rich text: its showinfo links (a region, a faction) become
              // links to their pages.
              <Text size="sm" c="dimmed" maw={720} component="div">
                <MailMessageViewer content={sde.subtitle} />
              </Text>
            )}
          </Stack>
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
          <Stat label="Progress">
            {sde?.targetProgress
              ? `${formatInteger(campaign.progress)} / ${formatInteger(sde.targetProgress)}`
              : formatInteger(campaign.progress)}
          </Stat>
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

        {sde?.targetProgress ? (
          <Progress
            value={Math.min(
              100,
              (campaign.progress / sde.targetProgress) * 100,
            )}
            color={campaign.state === "Expired" ? "gray" : "blue"}
            aria-label="Campaign progress"
          />
        ) : null}

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
