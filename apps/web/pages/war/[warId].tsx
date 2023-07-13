import React, { type ReactElement } from "react";
import { useRouter } from "next/router";
import { Container, Group, Stack, Text, Title } from "@mantine/core";

import { useGetWarsWarId } from "@jitaspace/esi-client";
import { WarReportIcon } from "@jitaspace/eve-icons";
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
} from "@jitaspace/ui";

import { MailLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const warId = router.query.warId as string;
  const { data: war } = useGetWarsWarId(parseInt(warId));

  return (
    <Container size="lg">
      <Stack>
        <Group>
          <WarReportIcon width={64} /> <Title order={1}>War Report</Title>
        </Group>
        <Group position="apart">
          <Group spacing="xl">
            {war?.data.aggressor.alliance_id && (
              <AllianceAvatar
                allianceId={war.data.aggressor.alliance_id}
                size="xl"
              />
            )}
            {war?.data.aggressor.corporation_id && (
              <CorporationAvatar
                corporationId={war.data.aggressor.corporation_id}
                size="xl"
              />
            )}
            <div>
              <Group noWrap>
                <Title order={3}>
                  {war?.data.aggressor.alliance_id && (
                    <AllianceName
                      span
                      allianceId={war.data.aggressor.alliance_id}
                    />
                  )}
                  {war?.data.aggressor.corporation_id && (
                    <CorporationName
                      span
                      corporationId={war.data.aggressor.corporation_id}
                    />
                  )}
                </Title>
                {war?.data.aggressor.alliance_id && (
                  <AllianceTickerBadge
                    allianceId={war?.data.aggressor.alliance_id}
                  />
                )}
                {war?.data.aggressor.corporation_id && (
                  <CorporationTickerBadge
                    corporationId={war?.data.aggressor.corporation_id}
                  />
                )}
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

            <OpenInformationWindowActionIcon
              entityId={
                war?.data.aggressor.corporation_id ??
                war?.data.aggressor.alliance_id
              }
            />
          </Group>
          <Group spacing="xl">
            {war?.data.defender.alliance_id && (
              <AllianceAvatar
                allianceId={war.data.defender.alliance_id}
                size="xl"
              />
            )}
            {war?.data.defender.corporation_id && (
              <CorporationAvatar
                corporationId={war.data.defender.corporation_id}
                size="xl"
              />
            )}
            <div>
              <Group noWrap>
                <Title order={3}>
                  {war?.data.defender.alliance_id && (
                    <AllianceName
                      span
                      allianceId={war.data.defender.alliance_id}
                    />
                  )}
                  {war?.data.defender.corporation_id && (
                    <CorporationName
                      span
                      corporationId={war.data.defender.corporation_id}
                    />
                  )}
                </Title>
                {war?.data.defender.alliance_id && (
                  <AllianceTickerBadge
                    allianceId={war?.data.defender.alliance_id}
                  />
                )}
                {war?.data.defender.corporation_id && (
                  <CorporationTickerBadge
                    corporationId={war?.data.defender.corporation_id}
                  />
                )}
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

            <OpenInformationWindowActionIcon
              entityId={
                war?.data.aggressor.corporation_id ??
                war?.data.aggressor.alliance_id
              }
            />
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
            <Group noWrap key={ally.alliance_id ?? ally.corporation_id}>
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
  return <MailLayout>{page}</MailLayout>;
};
