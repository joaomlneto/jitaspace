"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Group,
  Skeleton,
  Stack,
  Text,
  Timeline,
  Title,
} from "@mantine/core";
import {
  IconBriefcase,
  IconExternalLink,
  IconId,
  IconUserCircle,
} from "@tabler/icons-react";
import { format, formatDistanceStrict } from "date-fns";

import { useGetCharactersCharacterIdCorporationhistory } from "@jitaspace/esi-client";
import {
  AllianceName,
  CharacterName,
  CharacterOnlineIndicator,
  CorporationName,
  FactionName,
  SolarSystemAnchor,
  SolarSystemName,
  StationAnchor,
  StationName,
  TypeAnchor,
  TypeName,
} from "@jitaspace/eve-components";
import {
  useAuthenticatedCharacter,
  useCharacter,
  useCharacterSkills,
  useSelectedCharacter,
} from "@jitaspace/hooks";
import { useCharacterWalletBalance } from "@jitaspace/hooks/src/hooks/character/useCharacterWalletBalance";
import { useGetNpcCorporationDivisionById } from "@jitaspace/sde-client";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import {
  AllianceAvatar,
  CharacterAvatar,
  CorporationAvatar,
  DateHoverCard,
  FactionAvatar,
  FormattedDateText,
  ISKAmount,
  TypeAvatar,
} from "@jitaspace/ui";

import { OpenInformationWindowActionIcon } from "~/components/ActionIcon";
import { StationAvatar } from "~/components/Avatar";
import {
  CharacterLocationCard,
  CharacterSkillTrainingCard,
} from "~/components/Card";
import { MailMessageViewer } from "~/components/EveMail";
import { BloodlineName, RaceName } from "~/components/Text";

/** Map an EVE security status (-10 … +10) to a theme-safe Mantine color. */
function securityStatusColor(sec: number): string {
  if (sec >= 5) return "teal";
  if (sec > 0) return "green";
  if (sec === 0) return "gray";
  if (sec > -5) return "orange";
  return "red";
}

/** A dimmed uppercase eyebrow that sits above a section's content. */
function SectionTitle({
  icon,
  children,
}: Readonly<{
  icon?: ReactNode;
  children: ReactNode;
}>) {
  return (
    <Group gap="xs" mb="md" wrap="nowrap">
      {icon}
      <Title order={4} style={{ letterSpacing: "0.08em" }}>
        {children}
      </Title>
    </Group>
  );
}

/** A single label / value row used inside the Details card. */
function InfoRow({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="xl" align="center">
      <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
        {label}
      </Text>
      <Box style={{ textAlign: "right", minWidth: 0 }}>{children}</Box>
    </Group>
  );
}

/**
 * Renders a capsuleer's age. The birthday row only mounts once character data
 * has loaded client-side, so a per-mount `now` is safe (no SSR/hydration gap).
 */
function CharacterAge({ birthday }: Readonly<{ birthday: Date }>) {
  const [now] = useState(() => new Date());
  return <>{formatDistanceStrict(birthday, now)}</>;
}

/** Public employment history — the corporations a character has belonged to. */
function CharacterEmploymentHistory({
  characterId,
}: Readonly<{ characterId: number }>) {
  const { data, isLoading } =
    useGetCharactersCharacterIdCorporationhistory(characterId);

  const entries = useMemo(() => {
    const history = data?.data;
    if (!history) return [];
    // Newest first. Each record ends when the next-newer record begins.
    const sorted = [...history].sort((a, b) => b.record_id - a.record_id);
    return sorted.map((entry, index) => ({
      ...entry,
      endDate: index === 0 ? undefined : sorted[index - 1]?.start_date,
      isCurrent: index === 0,
    }));
  }, [data?.data]);

  if (isLoading) {
    return (
      <Stack gap="lg">
        {[0, 1, 2].map((i) => (
          <Group key={i} gap="sm" wrap="nowrap">
            <Skeleton height={32} circle />
            <Stack gap={6} style={{ flex: 1 }}>
              <Skeleton height={14} width="45%" />
              <Skeleton height={10} width="70%" />
            </Stack>
          </Group>
        ))}
      </Stack>
    );
  }

  if (entries.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No employment history available.
      </Text>
    );
  }

  return (
    <Timeline active={-1} bulletSize={32} lineWidth={2}>
      {entries.map((entry) => (
        <Timeline.Item
          key={entry.record_id}
          bullet={
            <CorporationAvatar corporationId={entry.corporation_id} size={28} />
          }
          title={
            <Group gap="xs">
              <Anchor
                component={Link}
                href={`/corporation/${entry.corporation_id}`}
              >
                <CorporationName
                  span
                  corporationId={entry.corporation_id}
                  fw={500}
                />
              </Anchor>
              {entry.isCurrent && (
                <Badge size="xs" color="teal" variant="light">
                  Current
                </Badge>
              )}
              {entry.is_deleted && (
                <Badge size="xs" color="red" variant="light">
                  Closed
                </Badge>
              )}
            </Group>
          }
        >
          <Text size="xs" c="dimmed" mt={4}>
            {format(new Date(entry.start_date), "yyyy-MM-dd")}
            {entry.endDate ? (
              <>
                {" → "}
                {format(new Date(entry.endDate), "yyyy-MM-dd")}
                {" · "}
                {formatDistanceStrict(
                  new Date(entry.start_date),
                  new Date(entry.endDate),
                )}
              </>
            ) : (
              <> · present</>
            )}
          </Text>
        </Timeline.Item>
      ))}
    </Timeline>
  );
}

export default function Page() {
  const params = useParams();
  const rawCharacterId = params.characterId;
  const characterId = Number(
    typeof rawCharacterId === "string" ? rawCharacterId : rawCharacterId?.[0],
  );

  const selectedCharacter = useSelectedCharacter();
  const { data: character } = useCharacter(characterId);

  // Authenticated enrichment — only resolves when the viewer has a live token
  // for this exact character (i.e. viewing one of their own characters).
  const authenticatedCharacter = useAuthenticatedCharacter(characterId);
  const { data: walletBalance, isAllowed: canReadWallet } =
    useCharacterWalletBalance(characterId);
  const { data: skills, hasToken: canReadSkills } =
    useCharacterSkills(characterId);

  const { data: agentDivision } = useGetNpcCorporationDivisionById(
    character?.type === "agent" ? character.agentDivisionId : 0,
    { query: { enabled: character?.type === "agent" } },
  );

  if (!Number.isFinite(characterId)) {
    return null;
  }

  const cleanTitle = character?.title
    ? character.title.replace(/<[^<>]*>/g, "").trim()
    : undefined;

  let npcBadgeLabel: string | undefined;
  if (character?.type === "agent") {
    npcBadgeLabel = character.isResearchAgent ? "Research Agent" : "Agent";
  } else if (character?.isNpc) {
    npcBadgeLabel = "NPC";
  }

  const showCapsuleerStatus =
    !!authenticatedCharacter && !authenticatedCharacter.sessionExpired;

  return (
    <Container size="lg" py="md">
      <Stack gap="xl">
        {/* ---- Hero ---------------------------------------------------- */}
        <Card padding="xl">
          <Group align="flex-start" gap="xl" wrap="wrap">
            <CharacterOnlineIndicator
              characterId={characterId}
              position="bottom-end"
              offset={14}
              size={16}
              withBorder
            >
              <CharacterAvatar
                characterId={characterId}
                size={128}
                radius="md"
              />
            </CharacterOnlineIndicator>

            <Stack gap="sm" style={{ flex: 1, minWidth: 240 }}>
              <div>
                {cleanTitle && (
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={2}>
                    {cleanTitle}
                  </Text>
                )}
                <Group gap="sm" align="center">
                  <Title order={2}>
                    <CharacterName span characterId={characterId} />
                  </Title>
                  {npcBadgeLabel && (
                    <Badge variant="light">{npcBadgeLabel}</Badge>
                  )}
                  {character?.securityStatus !== undefined && (
                    <Badge
                      variant="light"
                      color={securityStatusColor(character.securityStatus)}
                    >
                      {character.securityStatus.toFixed(1)}
                    </Badge>
                  )}
                  {selectedCharacter && (
                    <OpenInformationWindowActionIcon
                      characterId={selectedCharacter.characterId}
                      entityId={characterId}
                    />
                  )}
                </Group>
              </div>

              {/* Affiliations */}
              <Stack gap={6}>
                {character?.corporationId && (
                  <Group gap="xs" wrap="nowrap">
                    <CorporationAvatar
                      corporationId={character.corporationId}
                      size="sm"
                    />
                    <Anchor
                      component={Link}
                      href={`/corporation/${character.corporationId}`}
                    >
                      <CorporationName
                        span
                        corporationId={character.corporationId}
                        size="sm"
                      />
                    </Anchor>
                  </Group>
                )}
                {character?.allianceId && (
                  <Group gap="xs" wrap="nowrap">
                    <AllianceAvatar
                      allianceId={character.allianceId}
                      size="sm"
                    />
                    <Anchor
                      component={Link}
                      href={`/alliance/${character.allianceId}`}
                    >
                      <AllianceName
                        span
                        allianceId={character.allianceId}
                        size="sm"
                      />
                    </Anchor>
                  </Group>
                )}
                {character?.factionId && (
                  <Group gap="xs" wrap="nowrap">
                    <FactionAvatar factionId={character.factionId} size="sm" />
                    <Anchor
                      component={Link}
                      href={`/faction/${character.factionId}`}
                    >
                      <FactionName
                        span
                        factionId={character.factionId}
                        size="sm"
                      />
                    </Anchor>
                  </Group>
                )}
              </Stack>

              {/* External resources */}
              <Group gap="xs" mt={4}>
                <Button
                  component={Link}
                  href={`https://evewho.com/character/${characterId}`}
                  target="_blank"
                  size="xs"
                  leftSection={<IconExternalLink size={14} />}
                >
                  EveWho
                </Button>
                <Button
                  component={Link}
                  href={`https://zkillboard.com/character/${characterId}`}
                  target="_blank"
                  size="xs"
                  leftSection={<IconExternalLink size={14} />}
                >
                  zKillboard
                </Button>
              </Group>
            </Stack>
          </Group>
        </Card>

        {/* ---- Body --------------------------------------------------- */}
        <Grid gap="xl">
          {/* Main column — biography + employment history */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="xl">
              <Card padding="xl">
                <SectionTitle icon={<IconUserCircle size={18} />}>
                  Biography
                </SectionTitle>
                {character ? (
                  <MailMessageViewer
                    content={
                      character.description
                        ? sanitizeFormattedEveString(character.description)
                        : "No biography."
                    }
                  />
                ) : (
                  <Skeleton height={80} />
                )}
              </Card>

              <Card padding="xl">
                <SectionTitle icon={<IconBriefcase size={18} />}>
                  Employment History
                </SectionTitle>
                <CharacterEmploymentHistory characterId={characterId} />
              </Card>
            </Stack>
          </Grid.Col>

          {/* Aside column — the facts sidebar */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="xl">
              <Card padding="xl">
                <SectionTitle icon={<IconId size={18} />}>Details</SectionTitle>
                <Stack gap="sm">
                  {character?.securityStatus !== undefined && (
                    <>
                      <InfoRow label="Security Status">
                        <Text
                          span
                          fw={600}
                          c={securityStatusColor(character.securityStatus)}
                        >
                          {character.securityStatus.toFixed(2)}
                        </Text>
                      </InfoRow>
                      <Divider />
                    </>
                  )}
                  {character?.birthday && (
                    <>
                      <InfoRow label="Born">
                        <DateHoverCard date={character.birthday}>
                          <FormattedDateText
                            date={character.birthday}
                            format="d MMM yyyy"
                          />
                        </DateHoverCard>
                      </InfoRow>
                      <InfoRow label="Age">
                        <Text span>
                          <CharacterAge birthday={character.birthday} />
                        </Text>
                      </InfoRow>
                      <Divider />
                    </>
                  )}
                  {character?.gender && (
                    <InfoRow label="Gender">
                      <Text span tt="capitalize">
                        {character.gender}
                      </Text>
                    </InfoRow>
                  )}
                  <InfoRow label="Race">
                    <Anchor
                      component={Link}
                      href={`/race/${character?.raceId}`}
                    >
                      <RaceName span raceId={character?.raceId} />
                    </Anchor>
                  </InfoRow>
                  <InfoRow label="Bloodline">
                    <Anchor
                      component={Link}
                      href={`/bloodline/${character?.bloodlineId}`}
                    >
                      <BloodlineName bloodlineId={character?.bloodlineId} />
                    </Anchor>
                  </InfoRow>
                  {character?.factionId && (
                    <InfoRow label="Faction">
                      <Anchor
                        component={Link}
                        href={`/faction/${character.factionId}`}
                      >
                        <FactionName span factionId={character.factionId} />
                      </Anchor>
                    </InfoRow>
                  )}
                </Stack>
              </Card>

              {/* NPC agent specifics */}
              {character?.type === "agent" && (
                <Card padding="xl">
                  <SectionTitle icon={<IconId size={18} />}>
                    Agent Details
                  </SectionTitle>
                  <Stack gap="sm">
                    <InfoRow label="Division">
                      <Text span>{agentDivision?.data.name.en ?? "—"}</Text>
                    </InfoRow>
                    <InfoRow label="Agent Type">
                      <Text span>{character.agentTypeId}</Text>
                    </InfoRow>
                    <InfoRow label="Level">
                      <Text span>{character.level}</Text>
                    </InfoRow>
                    <InfoRow label="Locator Agent">
                      <Text span>{character.isLocator ? "Yes" : "No"}</Text>
                    </InfoRow>
                    <InfoRow label="Station">
                      <Group wrap="nowrap" gap="xs" justify="flex-end">
                        <StationAvatar
                          stationId={character.locationId}
                          size="xs"
                        />
                        <StationAnchor
                          stationId={character.locationId}
                          target="_blank"
                        >
                          <StationName stationId={character.locationId} />
                        </StationAnchor>
                      </Group>
                    </InfoRow>
                    {character.isResearchAgent &&
                      character.researchSkills &&
                      character.researchSkills.length > 0 && (
                        <InfoRow label="Research Skills">
                          <Stack gap="xs">
                            {character.researchSkills.map((typeId) => (
                              <Group
                                wrap="nowrap"
                                gap="xs"
                                justify="flex-end"
                                key={typeId}
                              >
                                <TypeAvatar typeId={typeId} size="xs" />
                                <TypeAnchor typeId={typeId} target="_blank">
                                  <TypeName typeId={typeId} />
                                </TypeAnchor>
                              </Group>
                            ))}
                          </Stack>
                        </InfoRow>
                      )}
                    {character.isInSpace && (
                      <>
                        <Divider />
                        <InfoRow label="Solar System">
                          <SolarSystemAnchor
                            solarSystemId={character.solarSystemId}
                            target="_blank"
                          >
                            <SolarSystemName
                              solarSystemId={character.solarSystemId}
                            />
                          </SolarSystemAnchor>
                        </InfoRow>
                        <InfoRow label="Ship">
                          <Group wrap="nowrap" gap="xs" justify="flex-end">
                            <TypeAvatar typeId={character.typeId} size="xs" />
                            <TypeAnchor
                              typeId={character.typeId}
                              target="_blank"
                            >
                              <TypeName typeId={character.typeId} />
                            </TypeAnchor>
                          </Group>
                        </InfoRow>
                      </>
                    )}
                  </Stack>
                </Card>
              )}

              {/* Authenticated (own character) live data */}
              {showCapsuleerStatus && (
                <Card padding="xl">
                  <SectionTitle icon={<IconUserCircle size={18} />}>
                    Capsuleer Status
                  </SectionTitle>
                  <Stack gap="md">
                    {canReadWallet && (
                      <InfoRow label="Wallet">
                        <ISKAmount span fw={600} amount={walletBalance?.data} />
                      </InfoRow>
                    )}
                    {canReadSkills && (
                      <InfoRow label="Skill Points">
                        <Group gap={6} wrap="nowrap" justify="flex-end">
                          <TypeAvatar typeId={19430} size={16} />
                          <Text span fw={600}>
                            {skills?.data.total_sp.toLocaleString() ?? "—"} SP
                          </Text>
                        </Group>
                      </InfoRow>
                    )}
                    <CharacterLocationCard characterId={characterId} />
                    <CharacterSkillTrainingCard characterId={characterId} />
                  </Stack>
                </Card>
              )}
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
