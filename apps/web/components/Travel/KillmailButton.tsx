import { memo } from "react";
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

import {
  CharacterName,
  CorporationName,
  FactionName,
  TypeName,
} from "@jitaspace/eve-components";
import { CombatLogIcon, MercenaryIcon, WarsIcon } from "@jitaspace/eve-icons";
import { useKillmail } from "@jitaspace/hooks";
import {
  CharacterAvatar,
  CorporationAvatar,
  DateHoverCard,
  FactionAvatar,
  TimeAgoText,
  TypeAvatar,
  WarAnchor,
} from "@jitaspace/ui";

import { WarAggressorName, WarDefenderName } from "~/components/Text";

interface KillButtonProps {
  killmailId: number;
  killmailHash: string;
}

interface KillmailAttacker {
  character_id?: number;
  corporation_id?: number;
  faction_id?: number;
}

function AttackerAvatar({
  attacker,
}: Readonly<{ attacker: KillmailAttacker }>) {
  if (attacker.character_id) {
    return <CharacterAvatar characterId={attacker.character_id} size="sm" />;
  }
  if (attacker.corporation_id) {
    return (
      <CorporationAvatar corporationId={attacker.corporation_id} size="sm" />
    );
  }
  return <FactionAvatar factionId={attacker.faction_id} size="sm" />;
}

function AttackerName({ attacker }: Readonly<{ attacker: KillmailAttacker }>) {
  if (attacker.character_id) {
    return <CharacterName characterId={attacker.character_id} />;
  }
  if (attacker.corporation_id) {
    return <CorporationName corporationId={attacker.corporation_id} />;
  }
  return <FactionName factionId={attacker.faction_id} size="sm" />;
}

export const KillmailButton = memo(
  ({ killmailId, killmailHash }: KillButtonProps) => {
    const { data } = useKillmail(killmailHash, killmailId);
    return (
      <Anchor
        component={Link}
        href={`https://zkillboard.com/kill/${killmailId}/`}
        target="_blank"
      >
        <Group>
          <Group gap="xs">
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
              <Group gap={4}>
                <CombatLogIcon width={32} />
                <CharacterAvatar
                  characterId={data?.data.victim.character_id}
                  size="sm"
                />
                <TypeAvatar typeId={data?.data.victim.ship_type_id} size="sm" />
              </Group>
            </Tooltip>
          </Group>
          <Group gap="xs">
            <Tooltip
              color="dark"
              label={
                <Stack>
                  <Title order={5}>Attackers</Title>
                  {data?.data.attackers.map((attacker) => (
                    <Group key={attacker.character_id}>
                      <Group>
                        <AttackerAvatar attacker={attacker} />
                        <AttackerName attacker={attacker} />
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
              <Group gap={4}>
                <MercenaryIcon width={32} />
                <Avatar.Group spacing="xs">
                  {data?.data.attackers.map((attacker) => (
                    <AttackerAvatar
                      key={
                        attacker.character_id ??
                        attacker.corporation_id ??
                        attacker.faction_id
                      }
                      attacker={attacker}
                    />
                  ))}
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
                <DateHoverCard date={new Date(data.data.killmail_time)}>
                  <TimeAgoText
                    date={new Date(data.data.killmail_time)}
                    addSuffix
                  />
                </DateHoverCard>
              )}
            </Group>
          </Group>
        </Group>
      </Anchor>
    );
  },
);
