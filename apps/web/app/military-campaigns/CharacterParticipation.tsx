"use client";

import { useMemo } from "react";
import {
  Alert,
  Anchor,
  Button,
  Card,
  Code,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import type { EsiSubjectError } from "@jitaspace/hooks";
import { CharacterAnchor, EveEntityName } from "@jitaspace/eve-components";
import { useAuthStore } from "@jitaspace/hooks";
import { CharacterAvatar } from "@jitaspace/ui";

import type { MilitaryCampaign, MilitaryCampaignObjective } from "./esi";
import type { Participation } from "./parts";
import { DataTable } from "~/components/DataTable";
import { loginWithEveOnline } from "~/lib/eveOnlineLogin";
import { formatDateTime, formatInteger } from "~/lib/format";
import {
  campaignAnchorId,
  MILITARY_CAMPAIGNS_SCOPE,
  shortId,
  Stat,
  StateBadge,
} from "./parts";

interface ParticipationRow extends Participation {
  campaign: MilitaryCampaign | undefined;
  objective: MilitaryCampaignObjective | undefined;
}

function GrantAccessButton({ characterId }: Readonly<{ characterId: number }>) {
  const grantedScopes = useAuthStore(
    (state) => state.characters[characterId]?.accessTokenPayload.scp,
  );
  return (
    <Button
      size="xs"
      variant="light"
      onClick={() => {
        // Re-request what the character already granted, plus this one, so
        // signing in again does not take anything else away.
        loginWithEveOnline(
          [...new Set([...(grantedScopes ?? []), MILITARY_CAMPAIGNS_SCOPE])],
          "/military-campaigns",
        );
      }}
    >
      Grant access
    </Button>
  );
}

function CharacterSummaryCard({
  characterId,
  rows,
  canRead,
  isLoading,
  error,
}: Readonly<{
  characterId: number;
  rows: Participation[];
  canRead: boolean;
  isLoading: boolean;
  error: EsiSubjectError | undefined;
}>) {
  const totals = useMemo(
    () => ({
      campaigns: new Set(rows.map((row) => row.campaign_id)).size,
      objectives: rows.length,
      committed: rows.filter((row) => row.is_committed).length,
      contributed: rows.reduce((sum, row) => sum + row.contributed, 0),
    }),
    [rows],
  );

  let body;
  if (!canRead) {
    body = (
      <Stack gap="xs" align="flex-start">
        <Text size="sm" c="dimmed">
          This character has not granted access to its campaign activity.
        </Text>
        <GrantAccessButton characterId={characterId} />
      </Stack>
    );
  } else if (error) {
    body = (
      <Text size="sm" c="red">
        Could not load: {error.error.message}
      </Text>
    );
  } else if (isLoading) {
    body = <Skeleton height={44} />;
  } else {
    body = (
      <SimpleGrid cols={4} spacing="xs">
        <Stat label="Campaigns">{formatInteger(totals.campaigns)}</Stat>
        <Stat label="Objectives">{formatInteger(totals.objectives)}</Stat>
        <Stat label="Committed">{formatInteger(totals.committed)}</Stat>
        <Stat label="Contributed">{formatInteger(totals.contributed)}</Stat>
      </SimpleGrid>
    );
  }

  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="sm">
        <Group gap="sm" wrap="nowrap">
          <CharacterAvatar characterId={characterId} size={40} radius="sm" />
          <CharacterAnchor characterId={characterId} fw={600}>
            <EveEntityName entityId={characterId} />
          </CharacterAnchor>
        </Group>
        {body}
      </Stack>
    </Card>
  );
}

const columns: DataTableColumn<ParticipationRow>[] = [
  {
    id: "character",
    header: "Character",
    accessor: "subjectId",
    enableHiding: false,
    cell: (row) => (
      <Group gap="xs" wrap="nowrap">
        <CharacterAvatar characterId={row.subjectId} size={22} />
        <CharacterAnchor characterId={row.subjectId}>
          <EveEntityName entityId={row.subjectId} />
        </CharacterAnchor>
      </Group>
    ),
  },
  {
    id: "campaign",
    header: "Campaign",
    accessor: (row) => shortId(row.campaign_id),
    sortable: true,
    filter: { type: "select" },
    cell: (row) => (
      <Group gap="xs" wrap="nowrap">
        {row.campaign ? (
          <Anchor href={`#${campaignAnchorId(row.campaign_id)}`} size="sm">
            {shortId(row.campaign_id)}
          </Anchor>
        ) : (
          // A campaign ESI no longer lists has no card to jump to.
          <Tooltip label="ESI no longer lists this campaign">
            <Code>{shortId(row.campaign_id)}</Code>
          </Tooltip>
        )}
        {row.campaign && <StateBadge state={row.campaign.state} size="xs" />}
      </Group>
    ),
  },
  {
    id: "objective",
    header: "Objective",
    accessor: "id",
    cell: (row) => (
      <Group gap="xs" wrap="nowrap">
        <Tooltip label={row.id}>
          <Code>{shortId(row.id)}</Code>
        </Tooltip>
        {row.objective && <StateBadge state={row.objective.state} size="xs" />}
      </Group>
    ),
  },
  {
    id: "committed",
    header: "Committed",
    accessor: "is_committed",
    sortable: true,
    filter: { type: "boolean" },
    cell: (row) => (row.is_committed ? "Yes" : "No"),
  },
  {
    id: "contributed",
    header: "Contributed",
    accessor: "contributed",
    sortable: true,
    filter: { type: "range", min: 0 },
    align: "right",
    cell: (row) => formatInteger(row.contributed),
  },
  {
    id: "objectiveProgress",
    header: "Objective progress",
    accessor: (row) => row.objective?.progress,
    sortable: true,
    align: "right",
    cell: (row) =>
      row.objective ? formatInteger(row.objective.progress) : "—",
  },
  {
    id: "lastModified",
    header: "Last activity",
    accessor: "last_modified",
    sortable: true,
    filter: { type: "date-range" },
    cell: (row) => formatDateTime(row.last_modified),
  },
];

/**
 * The signed-in characters' side of the page: a card per character, then
 * every objective any of them took part in, in one table.
 */
export function CharacterParticipation({
  characterIds,
  readableCharacterIds,
  participations,
  errors,
  isPending,
  campaigns,
}: Readonly<{
  /** Every signed-in character. */
  characterIds: number[];
  /** The ones that granted the scope. */
  readableCharacterIds: number[];
  participations: Participation[];
  errors: EsiSubjectError[];
  isPending: boolean;
  campaigns: MilitaryCampaign[];
}>) {
  const byCharacter = useMemo(() => {
    const map = new Map<number, Participation[]>();
    for (const row of participations) {
      map.set(row.subjectId, [...(map.get(row.subjectId) ?? []), row]);
    }
    return map;
  }, [participations]);

  const rows = useMemo<ParticipationRow[]>(() => {
    const campaignsById = new Map(campaigns.map((c) => [c.id, c]));
    const objectivesById = new Map(
      campaigns.flatMap((c) => c.objectives.map((o) => [o.id, o] as const)),
    );
    return participations.map((row) => ({
      ...row,
      campaign: campaignsById.get(row.campaign_id),
      objective: objectivesById.get(row.id),
    }));
  }, [participations, campaigns]);

  const readable = new Set(readableCharacterIds);
  const errorByCharacter = new Map(errors.map((e) => [e.subjectId, e]));

  return (
    <Stack>
      <Title order={2}>Your characters</Title>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {characterIds.map((characterId) => (
          <CharacterSummaryCard
            key={characterId}
            characterId={characterId}
            rows={byCharacter.get(characterId) ?? []}
            canRead={readable.has(characterId)}
            isLoading={isPending}
            error={errorByCharacter.get(characterId)}
          />
        ))}
      </SimpleGrid>
      {readableCharacterIds.length > 0 &&
        (rows.length > 0 || isPending ? (
          <DataTable
            data={rows}
            columns={columns}
            rowId={(row) => `${row.subjectId}:${row.id}`}
            initialSort={{ columnId: "lastModified", direction: "desc" }}
            isLoading={isPending && rows.length === 0}
            withGlobalFilter
            withColumnVisibility
            withPagination
            defaultPageSize={25}
            verticalSpacing="xs"
            highlightOnHover
            striped
          />
        ) : (
          <Alert color="gray">
            None of your characters has taken part in a military campaign
            objective yet.
          </Alert>
        ))}
    </Stack>
  );
}
