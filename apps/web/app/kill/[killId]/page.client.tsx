"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconExternalLink, IconShield, IconSword } from "@tabler/icons-react";
import useSWR from "swr";

import {
  AllianceName,
  CharacterAnchor,
  CharacterName,
  CorporationName,
  FactionAnchor,
  FactionName,
  SolarSystemAnchor,
  SolarSystemName,
  SolarSystemSovereigntyAvatar,
  TypeAnchor,
  TypeName,
} from "@jitaspace/eve-components";
import { useKillmail } from "@jitaspace/hooks";
import {
  AllianceAnchor,
  AllianceAvatar,
  CharacterAvatar,
  CorporationAnchor,
  CorporationAvatar,
  DateHoverCard,
  FactionAvatar,
  ISKAmount,
  TimeAgoText,
  TypeAvatar,
} from "@jitaspace/ui";

import { EsiKillmailFittingCard } from "~/components/Fitting";

interface ZkillboardKill {
  killmail_id: number;
  zkb: {
    locationID: number;
    hash: string;
    fittedValue: number;
    droppedValue: number;
    destroyedValue: number;
    totalValue: number;
    points: number;
    npc: boolean;
    solo: boolean;
    awox: boolean;
  };
}

function AttackerPilot({
  attacker,
}: Readonly<{ attacker: { character_id?: number; faction_id?: number } }>) {
  if (attacker.character_id) {
    return (
      <>
        <CharacterAvatar characterId={attacker.character_id} size="xs" />
        <CharacterAnchor characterId={attacker.character_id}>
          <CharacterName size="sm" characterId={attacker.character_id} />
        </CharacterAnchor>
      </>
    );
  }
  if (attacker.faction_id) {
    return (
      <>
        <FactionAvatar factionId={attacker.faction_id} size="xs" />
        <FactionAnchor factionId={attacker.faction_id}>
          <FactionName size="sm" factionId={attacker.faction_id} />
        </FactionAnchor>
      </>
    );
  }
  return (
    <Text size="sm" c="dimmed">
      NPC
    </Text>
  );
}

export default function Page() {
  const params = useParams();
  const searchParams = useSearchParams();

  const rawKillId = params?.killId;
  const killId = Number(
    typeof rawKillId === "string" ? rawKillId : rawKillId?.[0],
  );
  const hashParam = searchParams?.get("hash") ?? undefined;

  // Fetch from zKillboard only when no hash is provided
  const { data: zkbData, isLoading: zkbLoading } = useSWR<ZkillboardKill[]>(
    !hashParam && Number.isFinite(killId)
      ? `https://zkillboard.com/api/killID/${killId}/`
      : null,
    (url: string) => fetch(url).then((r) => r.json()),
  );

  const hash = hashParam ?? zkbData?.[0]?.zkb?.hash;
  const zkbMeta = hashParam ? undefined : zkbData?.[0]?.zkb;

  const { data: killmail } = useKillmail(hash ?? "", killId, undefined, {
    query: { enabled: !!hash && Number.isFinite(killId) },
  });

  if (!Number.isFinite(killId)) return null;

  const zkbNotFound = !hashParam && !zkbLoading && zkbData?.length === 0;
  const isLoading =
    (!hashParam && zkbLoading) || (!zkbNotFound && !!hash && !killmail?.data);

  if (isLoading) {
    return (
      <Container size="lg">
        <Group justify="center" mt="xl">
          <Loader />
          <Text>Loading killmail…</Text>
        </Group>
      </Container>
    );
  }

  if (zkbNotFound || !killmail?.data) {
    return (
      <Container size="lg">
        <Stack mt="xl">
          <Title order={3}>Killmail #{killId}</Title>
          <Text c="dimmed">
            Could not load killmail data. The kill may not exist or the API may
            be unavailable.
          </Text>
          <Link href={`https://zkillboard.com/kill/${killId}`} target="_blank">
            <Button
              size="xs"
              variant="outline"
              leftSection={<IconExternalLink size={14} />}
            >
              View on zKillboard
            </Button>
          </Link>
        </Stack>
      </Container>
    );
  }

  const km = killmail.data;
  const totalDamage = km.victim.damage_taken;
  const sortedAttackers = [...km.attackers].sort(
    (a, b) => (b.damage_done ?? 0) - (a.damage_done ?? 0),
  );

  const droppedItems =
    km.victim.items?.filter((i) => (i.quantity_dropped ?? 0) > 0) ?? [];
  const destroyedItems =
    km.victim.items?.filter((i) => (i.quantity_destroyed ?? 0) > 0) ?? [];

  return (
    <Container size="lg">
      <Stack>
        {/* Header */}
        <Group justify="space-between" wrap="nowrap">
          <Stack gap={0}>
            <Title order={2}>Killmail #{km.killmail_id}</Title>
            <Group gap="xs">
              <SolarSystemSovereigntyAvatar
                solarSystemId={km.solar_system_id}
                size="sm"
              />
              <SolarSystemAnchor solarSystemId={km.solar_system_id}>
                <SolarSystemName size="sm" solarSystemId={km.solar_system_id} />
              </SolarSystemAnchor>
              <Text size="sm" c="dimmed">
                •
              </Text>
              <DateHoverCard date={new Date(km.killmail_time)}>
                <TimeAgoText
                  date={new Date(km.killmail_time)}
                  addSuffix
                  size="sm"
                />
              </DateHoverCard>
            </Group>
          </Stack>
          <Group gap="xs" wrap="nowrap">
            {zkbMeta?.solo && <Badge color="blue">Solo</Badge>}
            {zkbMeta?.npc && <Badge color="gray">NPC</Badge>}
            {zkbMeta?.awox && <Badge color="red">AWOX</Badge>}
            <Link
              href={`https://zkillboard.com/kill/${km.killmail_id}`}
              target="_blank"
            >
              <Button
                size="xs"
                variant="outline"
                leftSection={<IconExternalLink size={14} />}
              >
                zKillboard
              </Button>
            </Link>
            <Link
              href={`https://eve-kill.com/kill/${km.killmail_id}`}
              target="_blank"
            >
              <Button
                size="xs"
                variant="outline"
                leftSection={<IconExternalLink size={14} />}
              >
                EVE-Kill
              </Button>
            </Link>
          </Group>
        </Group>

        {/* zKillboard ISK stats */}
        {zkbMeta && (
          <Card withBorder>
            <Group gap="xl" wrap="wrap">
              <Stack gap={0} align="center">
                <Text size="xs" c="dimmed">
                  Total Value
                </Text>
                <ISKAmount amount={zkbMeta.totalValue} />
              </Stack>
              <Stack gap={0} align="center">
                <Text size="xs" c="dimmed">
                  Destroyed
                </Text>
                <ISKAmount amount={zkbMeta.destroyedValue} />
              </Stack>
              <Stack gap={0} align="center">
                <Text size="xs" c="dimmed">
                  Dropped
                </Text>
                <ISKAmount amount={zkbMeta.droppedValue} />
              </Stack>
              <Stack gap={0} align="center">
                <Text size="xs" c="dimmed">
                  Fitted Value
                </Text>
                <ISKAmount amount={zkbMeta.fittedValue} />
              </Stack>
              <Stack gap={0} align="center">
                <Text size="xs" c="dimmed">
                  Points
                </Text>
                <Text fw={600}>{zkbMeta.points}</Text>
              </Stack>
            </Group>
          </Card>
        )}

        {/* Victim + Fitting */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Card withBorder h="100%">
              <Stack gap="xs">
                <Group gap="xs">
                  <IconShield size={16} />
                  <Text fw={600}>Victim</Text>
                  <Badge color="red" size="sm">
                    {km.victim.damage_taken.toLocaleString()} damage taken
                  </Badge>
                </Group>
                <Divider />
                {km.victim.character_id ? (
                  <Group gap="xs" wrap="nowrap">
                    <CharacterAvatar
                      characterId={km.victim.character_id}
                      size="md"
                    />
                    <Stack gap={2}>
                      <CharacterAnchor characterId={km.victim.character_id}>
                        <CharacterName
                          fw={600}
                          characterId={km.victim.character_id}
                        />
                      </CharacterAnchor>
                      {km.victim.corporation_id && (
                        <Group gap="xs">
                          <CorporationAvatar
                            corporationId={km.victim.corporation_id}
                            size="xs"
                          />
                          <CorporationAnchor
                            corporationId={km.victim.corporation_id}
                          >
                            <CorporationName
                              size="xs"
                              corporationId={km.victim.corporation_id}
                            />
                          </CorporationAnchor>
                        </Group>
                      )}
                      {km.victim.alliance_id && (
                        <Group gap="xs">
                          <AllianceAvatar
                            allianceId={km.victim.alliance_id}
                            size="xs"
                          />
                          <AllianceAnchor allianceId={km.victim.alliance_id}>
                            <AllianceName
                              size="xs"
                              allianceId={km.victim.alliance_id}
                            />
                          </AllianceAnchor>
                        </Group>
                      )}
                      {km.victim.faction_id && (
                        <Group gap="xs">
                          <FactionAvatar
                            factionId={km.victim.faction_id}
                            size="xs"
                          />
                          <FactionAnchor factionId={km.victim.faction_id}>
                            <FactionName
                              size="xs"
                              factionId={km.victim.faction_id}
                            />
                          </FactionAnchor>
                        </Group>
                      )}
                    </Stack>
                  </Group>
                ) : (
                  <Text size="sm" c="dimmed">
                    Structure / NPC
                  </Text>
                )}
                <Group gap="xs">
                  <TypeAvatar typeId={km.victim.ship_type_id} size="sm" />
                  <TypeAnchor typeId={km.victim.ship_type_id}>
                    <TypeName fw={500} typeId={km.victim.ship_type_id} />
                  </TypeAnchor>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <EsiKillmailFittingCard killmailId={killId} killmailHash={hash!} />
          </Grid.Col>
        </Grid>

        {/* Attackers */}
        <Stack gap="xs">
          <Title order={4}>
            <Group gap="xs">
              <IconSword size={18} />
              Attackers ({km.attackers.length})
            </Group>
          </Title>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Pilot</Table.Th>
                <Table.Th>Corporation / Alliance</Table.Th>
                <Table.Th>Ship</Table.Th>
                <Table.Th>Weapon</Table.Th>
                <Table.Th>Damage</Table.Th>
                <Table.Th>%</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sortedAttackers.map((attacker) => (
                <Table.Tr
                  key={`${attacker.character_id ?? ""}-${attacker.corporation_id ?? ""}-${attacker.faction_id ?? ""}-${attacker.ship_type_id ?? ""}-${attacker.weapon_type_id ?? ""}-${attacker.damage_done ?? 0}`}
                >
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      {attacker.final_blow && (
                        <Badge size="xs" color="red">
                          Final
                        </Badge>
                      )}
                      <AttackerPilot attacker={attacker} />
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={2}>
                      {attacker.corporation_id && (
                        <Group gap="xs" wrap="nowrap">
                          <CorporationAvatar
                            corporationId={attacker.corporation_id}
                            size="xs"
                          />
                          <CorporationAnchor
                            corporationId={attacker.corporation_id}
                          >
                            <CorporationName
                              size="sm"
                              corporationId={attacker.corporation_id}
                            />
                          </CorporationAnchor>
                        </Group>
                      )}
                      {attacker.alliance_id && (
                        <Group gap="xs" wrap="nowrap">
                          <AllianceAvatar
                            allianceId={attacker.alliance_id}
                            size="xs"
                          />
                          <AllianceAnchor allianceId={attacker.alliance_id}>
                            <AllianceName
                              size="sm"
                              allianceId={attacker.alliance_id}
                            />
                          </AllianceAnchor>
                        </Group>
                      )}
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    {attacker.ship_type_id && (
                      <Group gap="xs" wrap="nowrap">
                        <TypeAvatar typeId={attacker.ship_type_id} size="xs" />
                        <TypeAnchor typeId={attacker.ship_type_id}>
                          <TypeName size="sm" typeId={attacker.ship_type_id} />
                        </TypeAnchor>
                      </Group>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {attacker.weapon_type_id && (
                      <Group gap="xs" wrap="nowrap">
                        <TypeAvatar
                          typeId={attacker.weapon_type_id}
                          size="xs"
                        />
                        <TypeAnchor typeId={attacker.weapon_type_id}>
                          <TypeName
                            size="sm"
                            typeId={attacker.weapon_type_id}
                          />
                        </TypeAnchor>
                      </Group>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {(attacker.damage_done ?? 0).toLocaleString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {totalDamage > 0
                        ? `${Math.round(((attacker.damage_done ?? 0) / totalDamage) * 100)}%`
                        : "—"}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>

        {/* Items */}
        {(droppedItems.length > 0 || destroyedItems.length > 0) && (
          <Stack gap="xs">
            <Title order={4}>Items</Title>
            <Grid>
              {droppedItems.length > 0 && (
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Stack gap="xs">
                    <Text fw={500} c="green">
                      Dropped ({droppedItems.length})
                    </Text>
                    <Table striped>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Item</Table.Th>
                          <Table.Th>Qty</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {droppedItems.map((item) => (
                          <Table.Tr key={`${item.item_type_id}-${item.flag}`}>
                            <Table.Td>
                              <Group gap="xs" wrap="nowrap">
                                <TypeAvatar
                                  typeId={item.item_type_id}
                                  size="xs"
                                />
                                <TypeAnchor typeId={item.item_type_id}>
                                  <TypeName
                                    size="sm"
                                    typeId={item.item_type_id}
                                  />
                                </TypeAnchor>
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">
                                {item.quantity_dropped?.toLocaleString()}
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Stack>
                </Grid.Col>
              )}
              {destroyedItems.length > 0 && (
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Stack gap="xs">
                    <Text fw={500} c="red">
                      Destroyed ({destroyedItems.length})
                    </Text>
                    <Table striped>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Item</Table.Th>
                          <Table.Th>Qty</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {destroyedItems.map((item) => (
                          <Table.Tr key={`${item.item_type_id}-${item.flag}`}>
                            <Table.Td>
                              <Group gap="xs" wrap="nowrap">
                                <TypeAvatar
                                  typeId={item.item_type_id}
                                  size="xs"
                                />
                                <TypeAnchor typeId={item.item_type_id}>
                                  <TypeName
                                    size="sm"
                                    typeId={item.item_type_id}
                                  />
                                </TypeAnchor>
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">
                                {item.quantity_destroyed?.toLocaleString()}
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Stack>
                </Grid.Col>
              )}
            </Grid>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
