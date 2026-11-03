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
import { EveEntityName } from "@jitaspace/eve-components";
import {
  MILITARY_CAMPAIGN_ACTIVITY_SCOPE,
  useAuthStore,
} from "@jitaspace/hooks";
import { CharacterAvatar } from "@jitaspace/ui";

import type { MilitaryCampaignsSdeInfo } from "./data";
import type { MilitaryCampaign, MilitaryCampaignObjective } from "./esi";
import type { Participation } from "./parts";
import { CharacterAnchor } from "~/components/Anchor";
import { DataTable } from "~/components/DataTable";
import { loginWithEveOnline } from "~/lib/eveOnlineLogin";
import { formatDateTime, formatInteger } from "~/lib/format";
import { grantedScopesOf } from "~/lib/grantedScopes";
import {
  campaignAnchorId,
  campaignTitle,
  objectiveTitle,
  Stat,
  StateBadge,
} from "./parts";

interface ParticipationRow extends Participation {
  campaign: MilitaryCampaign | undefined;
  objective: MilitaryCampaignObjective | undefined;
  campaignTitle: string;
  objectiveTitle: string;
  /** The objective's target, in its own unit (see data.ts). */
  objectiveTarget: number | null;
}

function GrantAccessButton({
  characterId,
  children,
}: Readonly<{ characterId: number; children: string }>) {
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
          [
            ...new Set([
              ...grantedScopesOf(grantedScopes),
              MILITARY_CAMPAIGN_ACTIVITY_SCOPE,
            ]),
          ],
          "/military-campaigns",
        );
      }}
    >
      {children}
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
  // A character drops out of the readable ones when its session expires, as
  // well as when it never granted the scope; the two need different words.
  const sessionExpired = useAuthStore(
    (state) => state.characters[characterId]?.sessionExpired ?? false,
  );

  const totals = useMemo(
    () => ({
      campaigns: new Set(rows.map((row) => row.campaign_id)).size,
      objectives: rows.length,
      committed: rows.filter((row) => row.is_committed).length,
      // No contribution total: each objective counts in its own unit
      // (missions for one, raw ISK for another), so a sum would mix them.
    }),
    [rows],
  );

  let body;
  if (!canRead) {
    body = (
      <Stack gap="xs" align="flex-start">
        <Text size="sm" c="dimmed">
          {sessionExpired
            ? "This character's session has expired."
            : "This character has not granted access to its campaign activity."}
        </Text>
        <GrantAccessButton characterId={characterId}>
          {sessionExpired ? "Sign in again" : "Grant access"}
        </GrantAccessButton>
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
      <SimpleGrid cols={3} spacing="xs">
        <Stat label="Campaigns">{formatInteger(totals.campaigns)}</Stat>
        <Stat label="Objectives">{formatInteger(totals.objectives)}</Stat>
        <Stat label="Committed">{formatInteger(totals.committed)}</Stat>
      </SimpleGrid>
    );
  }

  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="sm">
        <Group gap="sm" wrap="nowrap">
          <CharacterAvatar characterId={characterId} size={40} />
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
    accessor: "campaignTitle",
    sortable: true,
    filter: { type: "select" },
    cell: (row) => (
      <Group gap="xs" wrap="nowrap">
        {row.campaign ? (
          <Anchor href={`#${campaignAnchorId(row.campaign_id)}`} size="sm">
            {row.campaignTitle}
          </Anchor>
        ) : (
          // A campaign ESI no longer lists has no card to jump to.
          <Tooltip label="ESI no longer lists this campaign">
            <Text size="sm" span>
              {row.campaignTitle}
            </Text>
          </Tooltip>
        )}
        {row.campaign && <StateBadge state={row.campaign.state} size="xs" />}
      </Group>
    ),
  },
  {
    id: "objective",
    header: "Objective",
    accessor: "objectiveTitle",
    sortable: true,
    cell: (row) => (
      <Group gap="xs" wrap="nowrap">
        <Tooltip label={<Code>{row.id}</Code>}>
          <Text size="sm" span>
            {row.objectiveTitle}
          </Text>
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
    cell: (row) => {
      if (!row.objective) return "—";
      const progress = formatInteger(row.objective.progress);
      return row.objectiveTarget === null
        ? progress
        : `${progress} / ${formatInteger(row.objectiveTarget)}`;
    },
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
  pendingCharacterIds,
  campaigns,
  sdeInfo,
}: Readonly<{
  /** Every signed-in character. */
  characterIds: number[];
  /** The ones that granted the scope. */
  readableCharacterIds: number[];
  participations: Participation[];
  errors: EsiSubjectError[];
  /** True until every character has settled (or the auth store hydrated). */
  isPending: boolean;
  /**
   * The characters still loading. Each card waits only for its own, so one
   * slow character does not hold every other card on a skeleton.
   */
  pendingCharacterIds: number[];
  campaigns: MilitaryCampaign[];
  sdeInfo: MilitaryCampaignsSdeInfo;
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
      campaignTitle: campaignTitle(row.campaign_id, sdeInfo),
      objectiveTitle: objectiveTitle(row.id, sdeInfo),
      objectiveTarget: sdeInfo.objectives[row.id]?.targetProgress ?? null,
    }));
  }, [participations, campaigns, sdeInfo]);

  const readable = new Set(readableCharacterIds);
  const pending = new Set(pendingCharacterIds);
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
            isLoading={pending.has(characterId)}
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
