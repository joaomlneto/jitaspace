"use client";

import _React, { memo } from "react";
import { Group, Loader, Stack, Text, UnstyledButton } from "@mantine/core";
import { openContextModal } from "@mantine/modals";
import { IconExternalLink } from "@tabler/icons-react";

import { useKillmail } from "@jitaspace/hooks";
import {
  AllianceAnchor,
  AllianceAvatar,
  AllianceName,
  CharacterAnchor,
  CharacterAvatar,
  CharacterName,
  CorporationAnchor,
  CorporationAvatar,
  CorporationName,
  SolarSystemAnchor,
  SolarSystemName,
  SolarSystemSovereigntyAvatar,
  TypeAnchor,
  TypeAvatar,
  TypeName,
} from "@jitaspace/ui";

import { EsiKillmailFittingCard } from "~/components/Fitting";

interface KillmailCardProps {
  killmailId: number;
  killmailHash: string;
}

export const KillmailCard = memo(
  ({ killmailId, killmailHash }: KillmailCardProps) => {
    const { data } = useKillmail(killmailHash, killmailId);

    if (!data?.data) {
      return <Loader />;
    }

    return (
      <Group gap="xs">
        <Group>
          <Stack>
            <CharacterAvatar
              characterId={data?.data.victim.character_id}
              size="lg"
            />
          </Stack>
          <Stack gap="xs">
            <CharacterAnchor characterId={data?.data.victim.character_id}>
              <CharacterName
                size="md"
                characterId={data?.data.victim.character_id}
                fw={700}
              />
            </CharacterAnchor>
            {data.data.victim.corporation_id && (
              <Group gap="xs">
                <CorporationAvatar
                  size="xs"
                  corporationId={data?.data.victim.corporation_id}
                />
                <CorporationAnchor
                  corporationId={data.data.victim.corporation_id}
                >
                  <CorporationName
                    size="xs"
                    corporationId={data.data.victim.corporation_id}
                  />
                </CorporationAnchor>
              </Group>
            )}
            {data.data.victim.alliance_id && (
              <Group gap="xs">
                <AllianceAvatar
                  size="xs"
                  allianceId={data.data.victim.alliance_id}
                />
                <AllianceAnchor allianceId={data.data.victim.alliance_id}>
                  <AllianceName
                    size="xs"
                    allianceId={data.data.victim.alliance_id}
                  />
                </AllianceAnchor>
              </Group>
            )}
          </Stack>
          <Stack gap="xs">
            <Group gap="xs">
              <TypeAvatar typeId={data?.data.victim.ship_type_id} size="sm" />
              <TypeAnchor typeId={data?.data.victim.ship_type_id}>
                <TypeName
                  size="md"
                  typeId={data?.data.victim.ship_type_id}
                  fw={700}
                />
              </TypeAnchor>
              <UnstyledButton
                onClick={() => {
                  openContextModal({
                    modal: "killmailFitting",
                    withCloseButton: false,
                    size: "sm",
                    padding: 0,
                    innerProps: {
                      killmailId,
                      killmailHash,
                    },
                    style: {
                      padding: 0,
                      margin: 0,
                    },
                  });
                }}
              >
                <EsiKillmailFittingCard
                  killmailId={killmailId}
                  killmailHash={killmailHash}
                  hideModules
                />
              </UnstyledButton>
            </Group>
            <Group gap="xs">
              <SolarSystemSovereigntyAvatar
                solarSystemId={data?.data.solar_system_id}
                size="sm"
              />
              <SolarSystemAnchor solarSystemId={data?.data.solar_system_id}>
                <SolarSystemName
                  size="md"
                  solarSystemId={data?.data.solar_system_id}
                  fw={700}
                />
              </SolarSystemAnchor>
            </Group>
          </Stack>
        </Group>
        <Stack>
          <Group gap="xs">
            <IconExternalLink size={14} />
            <a
              href={`https://eve-kill.com/kill/${data.data.killmail_id}`}
              target="_blank"
            >
              <Text size="xs">EVE-Kill</Text>
            </a>
          </Group>
          <Group gap="xs">
            <IconExternalLink size={14} />
            <a
              href={`https://zkillboard.com/kill/${data.data.killmail_id}`}
              target="_blank"
            >
              <Text size="xs">zKillboard</Text>
            </a>
          </Group>
        </Stack>
      </Group>
    );
  },
);
KillmailCard.displayName = "KillmailCard";
