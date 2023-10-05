import React, { memo } from "react";
import Link from "next/link";
import {
  ActionIcon,
  Anchor,
  Avatar,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";

import { useGetKillmailsKillmailIdKillmailHash } from "@jitaspace/esi-client-kubb";
import { CombatLogIcon, MercenaryIcon, WarsIcon } from "@jitaspace/eve-icons";
import {
  CharacterAvatar,
  CharacterName,
  CorporationAvatar,
  CorporationName,
  FactionAvatar,
  FactionName,
  TimeAgoText,
  TypeAvatar,
  TypeName,
  WarAggressorName,
  WarAnchor,
  WarDefenderName,
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
      <Anchor
        component={Link}
        href={`https://zkillboard.com/kill/${killmailId}/`}
        target="_blank"
      >
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
                    <CharacterName
                      characterId={data?.data.victim.character_id}
                    />
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
                        {attacker.character_id ? (
                          <CharacterAvatar
                            characterId={attacker.character_id}
                            size="sm"
                          />
                        ) : attacker.corporation_id ? (
                          <CorporationAvatar
                            corporationId={attacker.corporation_id}
                            size="sm"
                          />
                        ) : (
                          <FactionAvatar
                            factionId={attacker.faction_id}
                            size="sm"
                          />
                        )}
                        {attacker.character_id ? (
                          <CharacterName characterId={attacker.character_id} />
                        ) : attacker.corporation_id ? (
                          <CorporationName
                            corporationId={attacker.corporation_id}
                          />
                        ) : (
                          <FactionName
                            factionId={attacker.faction_id}
                            size="sm"
                          />
                        )}
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
                  {data?.data.attackers.map((attacker) =>
                    attacker.character_id ? (
                      <CharacterAvatar
                        characterId={attacker.character_id}
                        size="sm"
                      />
                    ) : attacker.corporation_id ? (
                      <CorporationAvatar
                        corporationId={attacker.corporation_id}
                        size="sm"
                      />
                    ) : (
                      <FactionAvatar
                        factionId={attacker.faction_id}
                        size="sm"
                      />
                    ),
                  )}
                </Avatar.Group>
              </Group>
            </Tooltip>
            {data?.data.war_id && (
              <WarAnchor warId={data.data.war_id} target="_blank">
                <Tooltip
                  color="dark"
                  label={
                    <Text>
                      This kill is related to an on-going war between{" "}
                      <WarAggressorName span warId={data.data.war_id} /> and{" "}
                      <WarDefenderName span warId={data.data.war_id} />
                    </Text>
                  }
                >
                  <ActionIcon>
                    <WarsIcon width={32} />
                  </ActionIcon>
                </Tooltip>
              </WarAnchor>
            )}
            <Group>
              {data?.data.killmail_time && (
                <TimeAgoText
                  date={new Date(data?.data.killmail_time)}
                  addSuffix
                />
              )}
            </Group>
          </Group>
        </Group>
      </Anchor>
    );
  },
);
