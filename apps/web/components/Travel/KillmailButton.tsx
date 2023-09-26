import React, { memo } from "react";
import { Avatar, Group, Stack, Title, Tooltip } from "@mantine/core";

import { useGetKillmailsKillmailIdKillmailHash } from "@jitaspace/esi-client";
import { CombatLogIcon, MercenaryIcon, WarsIcon } from "@jitaspace/eve-icons";
import {
  CharacterAvatar,
  CharacterName,
  TimeAgoText,
  TypeAvatar,
  TypeName,
  WarAnchor,
} from "@jitaspace/ui";

type KillButtonProps = {
  killmailId: number;
  killmailHash: string;
};

export const KillmailButton = memo(
  ({ killmailId, killmailHash }: KillButtonProps) => {
    const { data } = useGetKillmailsKillmailIdKillmailHash(
      killmailId,
      killmailHash,
    );
    return (
      <Group>
        <Group spacing="xs">
          <Tooltip
            color="dark"
            label={
              <Stack>
                <Title order={5}>Victim</Title>
                <Group>
                  <CharacterAvatar
                    characterId={data?.data.victim.character_id}
                    size="sm"
                  />
                  <CharacterName characterId={data?.data.victim.character_id} />
                </Group>
                <Group>
                  <TypeAvatar
                    typeId={data?.data.victim.ship_type_id}
                    size="sm"
                  />
                  <TypeName typeId={data?.data.victim.ship_type_id} />
                </Group>
              </Stack>
            }
          >
            <Group spacing={4}>
              <CombatLogIcon width={32} />
              <CharacterAvatar
                characterId={data?.data.victim.character_id}
                size="sm"
              />
              <TypeAvatar typeId={data?.data.victim.ship_type_id} size="sm" />
            </Group>
          </Tooltip>
        </Group>
        <Group spacing="xs">
          <Tooltip
            color="dark"
            label={
              <Stack>
                <Title order={5}>Attackers</Title>
                {data?.data.attackers.map((attacker) => (
                  <Group key={attacker.character_id}>
                    <Group>
                      <CharacterAvatar
                        characterId={attacker.character_id}
                        size="sm"
                      />
                      <CharacterName characterId={attacker.character_id} />
                    </Group>
                    <Group>
                      <TypeAvatar typeId={attacker.ship_type_id} size="sm" />
                      <TypeName typeId={attacker.ship_type_id} />
                    </Group>
                  </Group>
                ))}
              </Stack>
            }
          >
            <Group spacing={4}>
              <MercenaryIcon width={32} />
              <Avatar.Group spacing="xs">
                {data?.data.attackers.map((attacker) => (
                  <CharacterAvatar
                    characterId={attacker.character_id}
                    size="sm"
                  />
                ))}
              </Avatar.Group>
            </Group>
          </Tooltip>
        </Group>
        <Group>
          {data?.data.killmail_time && (
            <TimeAgoText date={new Date(data?.data.killmail_time)} addSuffix />
          )}
          {data?.data.war_id && (
            <WarAnchor warId={data.data.war_id}>
              <WarsIcon />
            </WarAnchor>
          )}
        </Group>
      </Group>
    );
  },
);
