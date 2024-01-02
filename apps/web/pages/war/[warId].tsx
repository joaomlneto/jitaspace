import React, { type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { WarReportIcon } from "@jitaspace/eve-icons";
import { useSelectedCharacter, useWar } from "@jitaspace/hooks";
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

import { MainLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const warId = parseInt(router.query.warId as string);
  const character = useSelectedCharacter();
  const { data: war } = useWar(warId);

  return (
    <Container size="lg">
      <Stack>
        <Group position="apart">
          <Group>
            <WarReportIcon width={64} />
            <Title order={1}>War Report</Title>
          </Group>
          <Group>
            <Link href={`https://zkillboard.com/war/${warId}`} target="_blank">
              <Button size="xs">
                <Group spacing="xs">
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
                <Group spacing="xs">
                  <IconExternalLink size={14} />
                  DOTLAN EveMaps
                </Group>
              </Button>
            </Link>
          </Group>
        </Group>
        <Group position="apart">
          <Group spacing="xl" wrap="nowrap">
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
              <Text color="dimmed">Aggressor</Text>
              <Text color="dimmed">
                ISK Destroyed:{" "}
                <ISKAmount span amount={war?.data.aggressor.isk_destroyed} />
              </Text>
              <Text color="dimmed">
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
          <Group spacing="xl" wrap="nowrap">
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
              <Text color="dimmed">Defender</Text>
              <Text color="dimmed">
                ISK Destroyed:{" "}
                <ISKAmount span amount={war?.data.defender.isk_destroyed} />
              </Text>
              <Text color="dimmed">
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
          <Group align="center" position="apart">
            <Text>Declared on</Text>
            <Text>
              <FormattedDateText date={new Date(war.data.declared)} />
            </Text>
          </Group>
        )}
        {war?.data.started && (
          <Group align="center" position="apart">
            <Text>Started on</Text>
            <Text>
              <FormattedDateText date={new Date(war.data.started)} />
            </Text>
          </Group>
        )}
        {war?.data.retracted && (
          <Group align="center" position="apart">
            <Text>Retracted on</Text>
            <Text>
              <FormattedDateText date={new Date(war.data.retracted)} />
            </Text>
          </Group>
        )}
        {war?.data.finished && (
          <Group align="center" position="apart">
            <Text>Finished on</Text>
            <Text>
              <FormattedDateText date={new Date(war.data.finished)} />
            </Text>
          </Group>
        )}
        {war && (
          <Group align="center" position="apart">
            <Text>Mutual</Text>
            <Text>{war.data.mutual ? "Yes" : "No"}</Text>
          </Group>
        )}
        {war && (
          <Group align="center" position="apart">
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
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
