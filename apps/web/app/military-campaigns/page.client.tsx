"use client";

import { useMemo } from "react";
import { Alert, Container, Group, Stack, Text, Title } from "@mantine/core";

import { WarReportIcon } from "@jitaspace/eve-icons";
import {
  useAuthenticatedCharacterIds,
  useMultipleCharacterMilitaryCampaignObjectives,
} from "@jitaspace/hooks";

import type { MilitaryCampaignsSnapshot } from "./esi";
import type { Participation } from "./parts";
import { formatCountOf } from "~/lib/format";
import { CampaignCard } from "./CampaignCard";
import { CharacterParticipation } from "./CharacterParticipation";
import { STATE_ORDER } from "./parts";

const NO_PARTICIPATION: Participation[] = [];

export default function MilitaryCampaignsPage({
  snapshot,
}: Readonly<{ snapshot: MilitaryCampaignsSnapshot | null }>) {
  const characterIds = useAuthenticatedCharacterIds();
  const participation = useMultipleCharacterMilitaryCampaignObjectives();

  // Active first; within a state, the most recently started.
  const campaigns = useMemo(
    () =>
      [...(snapshot?.campaigns ?? [])].sort(
        (a, b) =>
          STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
          (b.started ?? "").localeCompare(a.started ?? ""),
      ),
    [snapshot],
  );

  const participationByCampaign = useMemo(() => {
    const map = new Map<string, Participation[]>();
    for (const row of participation.data) {
      map.set(row.campaign_id, [...(map.get(row.campaign_id) ?? []), row]);
    }
    return map;
  }, [participation.data]);

  const activeCount = campaigns.filter((c) => c.state === "Active").length;
  const activeObjectives = campaigns.reduce(
    (sum, c) => sum + c.objectives.filter((o) => o.state === "Active").length,
    0,
  );

  return (
    <Container size="xl">
      <Stack gap="xl">
        <Group>
          <WarReportIcon width={48} />
          <Stack gap={0}>
            <Title>Military Campaigns</Title>
            {snapshot && (
              <Text c="dimmed" size="sm">
                {formatCountOf(
                  activeCount,
                  "active campaign",
                  "active campaigns",
                )}{" "}
                of {formatCountOf(campaigns.length, "listed", "listed")},{" "}
                {formatCountOf(
                  activeObjectives,
                  "active objective",
                  "active objectives",
                )}
              </Text>
            )}
          </Stack>
        </Group>

        {characterIds.length > 0 && (
          <CharacterParticipation
            characterIds={characterIds}
            readableCharacterIds={participation.subjectIds}
            participations={participation.data}
            errors={participation.errors}
            isPending={participation.isPending}
            campaigns={campaigns}
          />
        )}

        <Stack>
          <Title order={2}>Campaigns</Title>
          {!snapshot && (
            <Alert color="orange" title="Campaigns unavailable">
              ESI did not answer for the campaign list. Try again in a minute.
            </Alert>
          )}
          {snapshot && campaigns.length === 0 && (
            <Alert color="gray">
              ESI lists no military campaigns right now.
            </Alert>
          )}
          {snapshot && campaigns.length > 0 && activeCount === 0 && (
            <Alert color="gray">
              No campaign is active right now. The most recent ones ESI still
              lists are below.
            </Alert>
          )}
          {snapshot &&
            campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                readAt={snapshot.readAt}
                participations={
                  participationByCampaign.get(campaign.id) ?? NO_PARTICIPATION
                }
                withMine={characterIds.length > 0}
              />
            ))}
        </Stack>
      </Stack>
    </Container>
  );
}
