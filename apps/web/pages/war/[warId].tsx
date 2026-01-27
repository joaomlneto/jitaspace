import type { ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { WarReportIcon } from "@jitaspace/eve-icons";
import {
  useSelectedCharacter,
  useWar,
  useWarKillmails,
} from "@jitaspace/hooks";
import {
  AllianceAnchor,
  AllianceAvatar,
  AllianceName,
  AllianceTickerBadge,
  CorporationAnchor,
  CorporationAvatar,
  CorporationName,
  CorporationTickerBadge,
  FormattedDateText,
  ISKAmount,
  OpenInformationWindowActionIcon,
  WarAggressorAnchor,
  WarAggressorAvatar,
  WarAggressorName,
  WarAggressorTickerBadge,
  WarDefenderAnchor,
  WarDefenderAvatar,
  WarDefenderName,
  WarDefenderTickerBadge,
} from "@jitaspace/ui";

import { KillmailCard } from "~/components/Killmails";
import { MainLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const warId = parseInt(router.query.warId as string);
  const character = useSelectedCharacter();
  const { data: war } = useWar(warId);
  const { data: killmails } = useWarKillmails(warId);

  return (
    <Container size="lg">
      <Stack>
        <Group justify="space-between">
          <Group>
            <WarReportIcon width={64} />
            <Title order={1}>War Report</Title>
          </Group>
          <Group>
            <Link href={`https://zkillboard.com/war/${warId}`} target="_blank">
              <Button size="xs">
                <Group gap="xs">
                  <IconExternalLink size={14} />
                  zKillboard
                </Group>
              </Button>
            </Link>
            <Link
              href={`https://evemaps.dotlan.net/war/${warId}`}
              target="_blank"
            >
              <Button size="xs">
                <Group gap="xs">
                  <IconExternalLink size={14} />
                  DOTLAN EveMaps
                </Group>
              </Button>
            </Link>
          </Group>
        </Group>
        <Group justify="space-between">
          <Group gap="xl" wrap="nowrap">
            <WarAggressorAvatar warId={warId} size="xl" />
            <div>
              <Group wrap="nowrap">
                <Title order={3}>
                  <WarAggressorAnchor warId={warId}>
                    <WarAggressorName span warId={warId} />
                  </WarAggressorAnchor>
                </Title>
                <WarAggressorTickerBadge warId={warId} />
              </Group>
              <Text c="dimmed">Aggressor</Text>
              <Text c="dimmed">ISK Destroyed: </Text>
              <ISKAmount span amount={war?.data.aggressor.isk_destroyed} />
              <Text c="dimmed">
                Ships Killed: {war?.data.aggressor.ships_killed}
              </Text>
            </div>

            {character && (
              <OpenInformationWindowActionIcon
                characterId={character.characterId}
                entityId={
                  war?.data.aggressor.corporation_id ??
                  war?.data.aggressor.alliance_id
                }
              />
            )}
          </Group>
          <Group gap="xl" wrap="nowrap">
            <WarDefenderAvatar warId={warId} size="xl" />
            <div>
              <Group wrap="nowrap">
                <Title order={3}>
                  <WarDefenderAnchor warId={warId}>
                    <WarDefenderName span warId={warId} />
                  </WarDefenderAnchor>
                </Title>
                <WarDefenderTickerBadge warId={warId} />
              </Group>
              <Text c="dimmed">Defender</Text>
              <Text c="dimmed">ISK Destroyed: </Text>
              <ISKAmount span amount={war?.data.defender.isk_destroyed} />
              <Text c="dimmed">
                Ships Killed: {war?.data.defender.ships_killed}
              </Text>
            </div>

            {character && (
              <OpenInformationWindowActionIcon
                characterId={character.characterId}
                entityId={
                  war?.data.aggressor.corporation_id ??
                  war?.data.aggressor.alliance_id
                }
              />
            )}
          </Group>
        </Group>

        {war && (
          <Group align="center" justify="space-between">
            <Text>Declared on</Text>
            <FormattedDateText date={new Date(war.data.declared)} />
          </Group>
        )}
        {war?.data.started && (
          <Group align="center" justify="space-between">
            <Text>Started on</Text>
            <FormattedDateText date={new Date(war.data.started)} />
          </Group>
        )}
        {war?.data.retracted && (
          <Group align="center" justify="space-between">
            <Text>Retracted on</Text>
            <FormattedDateText date={new Date(war.data.retracted)} />
          </Group>
        )}
        {war?.data.finished && (
          <Group align="center" justify="space-between">
            <Text>Finished on</Text>
            <FormattedDateText date={new Date(war.data.finished)} />
          </Group>
        )}
        {war && (
          <Group align="center" justify="space-between">
            <Text>Mutual</Text>
            <Text>{war.data.mutual ? "Yes" : "No"}</Text>
          </Group>
        )}
        {war && (
          <Group align="center" justify="space-between">
            <Text>Open for allies</Text>
            <Text>{war.data.open_for_allies ? "Yes" : "No"}</Text>
          </Group>
        )}
        <Title order={4}>Allies ({(war?.data.allies ?? []).length})</Title>
        <Stack>
          {war?.data.allies?.map((ally) => (
            <Group wrap="nowrap" key={ally.alliance_id ?? ally.corporation_id}>
              {ally.alliance_id && (
                <>
                  <AllianceAvatar allianceId={ally.alliance_id} size="sm" />
                  <AllianceAnchor allianceId={ally.alliance_id}>
                    <AllianceName span allianceId={ally.alliance_id} />
                  </AllianceAnchor>
                  <AllianceTickerBadge allianceId={ally.alliance_id} />
                </>
              )}
              {ally.corporation_id && (
                <>
                  <CorporationAvatar
                    corporationId={ally.corporation_id}
                    size="sm"
                  />
                  <CorporationAnchor corporationId={ally.corporation_id}>
                    <CorporationName span corporationId={ally.corporation_id} />
                  </CorporationAnchor>
                  <CorporationTickerBadge corporationId={ally.corporation_id} />
                </>
              )}
            </Group>
          ))}
        </Stack>
        <Title order={4}>Killmails ({(killmails?.data ?? []).length})</Title>
        <Stack>
          {(killmails?.data ?? []).map((killmail) => (
            <KillmailCard
              key={killmail.killmail_id}
              killmailId={killmail.killmail_id}
              killmailHash={killmail.killmail_hash}
            />
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
