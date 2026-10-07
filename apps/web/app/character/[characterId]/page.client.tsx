"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Badge,
  Breadcrumbs,
  Button,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import {
  IconBriefcase,
  IconExternalLink,
  IconId,
  IconInfoCircle,
  IconMapPin,
  IconSkull,
  IconUserCircle,
  IconUsers,
} from "@tabler/icons-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import type { CharactersDetail } from "@jitaspace/esi-client";
import { useGetCharactersCharacterIdCorporationhistory } from "@jitaspace/esi-client";
import { isNpcCharacterId } from "@jitaspace/esi-metadata";
import {
  AllianceName,
  CharacterOnlineIndicator,
  CorporationName,
  RegionAnchor,
  SolarSystemAnchor,
  StationAnchor,
  TypeAnchor,
  TypeAvatar,
} from "@jitaspace/eve-components";
import {
  useAuthenticatedCharacter,
  useCharacterSkills,
  useCharacterWalletBalance,
  useEsiCharacter,
  useSelectedCharacter,
} from "@jitaspace/hooks";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import {
  AllianceAnchor,
  BloodlineAnchor,
  CharacterAvatar,
  CorporationAnchor,
  DungeonAnchor,
  ISKAmount,
  RaceAnchor,
  SolarSystemSecurityStatusBadge,
} from "@jitaspace/ui";

import type { EmploymentSummary as EmploymentSummaryData } from "./employment";
import type { CharacterPageTab } from "./tabs";
import type {
  AgentDetails,
  CharacterRecord,
  EsiCharacterCard,
  NamedRef,
} from "./types";
import { OpenInformationWindowActionIcon } from "~/components/ActionIcon";
import {
  CharacterLocationCard,
  CharacterSkillTrainingCard,
} from "~/components/Card";
import {
  AllianceLine,
  CorporationLine,
  EntityLine,
  FactionLine,
  HeroCard,
  HeroStat,
  SectionHeading,
  StatCard,
} from "~/components/EntityPage";
import { MailMessageViewer } from "~/components/EveMail";
import { BloodlineName, RaceName } from "~/components/Text";
import {
  iskEfficiency,
  KillboardSummaryCards,
  KillboardTab,
  useZkillboardStats,
} from "~/components/Zkillboard";
import {
  formatAge,
  formatDate,
  formatInteger,
  formatPercent,
} from "~/lib/format";
import { named } from "~/lib/namedRef";
import { formatDays, summarizeEmployment, toStints } from "./employment";
import { EmploymentHistory } from "./EmploymentHistory";
import {
  CHARACTER_PAGE_TABS,
  DEFAULT_CHARACTER_PAGE_TAB,
  isCharacterPageTab,
} from "./tabs";

export interface PageProps {
  characterId: number;
  /** Null when ESI could not be reached at render time. */
  esi: EsiCharacterCard | null;
  /** Null when we have no row, or the database could not be reached. */
  record: CharacterRecord | null;
}

const EXTERNAL_LINKS = [
  { label: "EveWho", href: "https://evewho.com/character/" },
  { label: "zKillboard", href: "https://zkillboard.com/character/" },
] as const;

/** The 'Skill points' icon type, for the capsuleer's own SP. */
const SKILL_POINTS_TYPE_ID = 19430;

/** Map an EVE security status (-10 … +10) to a theme-safe Mantine color. */
function securityStatusColor(sec: number): string {
  if (sec >= 5) return "teal";
  if (sec > 0) return "green";
  if (sec === 0) return "gray";
  if (sec > -5) return "orange";
  return "red";
}

// The browser's clock, read once, only on the client. The server snapshot is
// null: reading the clock while the page prerenders would drop it out of the
// ISR cache. Used only when the server had no ESI card to time-stamp.
let clientNow: string | null = null;
const subscribeToNothing = () => () => undefined;
const getClientNow = () => (clientNow ??= new Date().toISOString());
const getServerNow = () => null;

/**
 * The sheet fields ESI omits when they are unset: alliance, militia, security
 * status, title, biography. Taken whole from the newest source, so a field ESI
 * stopped sending (a character who left an alliance or Faction Warfare) is
 * gone, rather than filled back in from an older one.
 */
function optionalFields(
  live: CharactersDetail | undefined,
  card: EsiCharacterCard | null,
  record: CharacterRecord | null,
) {
  if (live) {
    return {
      allianceId: live.alliance_id,
      factionId: live.faction_id ?? null,
      securityStatus: live.security_status ?? null,
      title: live.corporation_title ?? null,
      description: live.description ?? null,
    };
  }
  if (card) {
    return {
      allianceId: card.alliance?.id,
      factionId: card.factionId,
      securityStatus: card.securityStatus,
      title: card.title,
      description: card.description,
    };
  }
  return {
    allianceId: undefined,
    factionId: record?.faction?.id ?? null,
    securityStatus: record?.securityStatus ?? null,
    title: record?.title ?? null,
    description: record?.description ?? null,
  };
}

/**
 * Who the character is. Live ESI wins once it answers; until then the
 * server's ESI card (which the cached HTML was rendered from, so hydration
 * agrees); for an NPC ESI does not know, our database row.
 */
function resolveIdentity(
  live: CharactersDetail | undefined,
  card: EsiCharacterCard | null,
  record: CharacterRecord | null,
) {
  const corporationId =
    live?.corporation_id ?? card?.corporation.id ?? record?.corporation.id;
  const { allianceId, ...optional } = optionalFields(live, card, record);
  return {
    ...optional,
    name: live?.name ?? card?.name ?? record?.name,
    birthday: live?.birthday ?? card?.birthday ?? null,
    gender: live?.gender ?? card?.gender ?? record?.gender,
    raceId: live?.race_id ?? card?.raceId ?? record?.race.id,
    bloodlineId:
      live?.bloodline_id ?? card?.bloodlineId ?? record?.bloodline.id,
    corporation: named(corporationId, card?.corporation, record?.corporation),
    alliance: named(allianceId, card?.alliance),
    achievementScore: live?.achievement_score ?? card?.achievementScore ?? null,
  };
}

function CorporationList({
  corporations,
}: Readonly<{ corporations: NamedRef[] }>) {
  return (
    <Stack gap={4}>
      {corporations.map((corporation) => (
        <CorporationLine key={corporation.id} corporation={corporation} />
      ))}
    </Stack>
  );
}

function AgentPanel({ agent }: Readonly<{ agent: AgentDetails }>) {
  const { station, inSpace } = agent;
  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
        <StatCard label="Level" value={`Level ${agent.level}`} />
        <StatCard
          label="Agent type"
          value={agent.agentType.name ?? agent.agentType.id}
        />
        <StatCard
          label="Division"
          value={agent.division.name ?? agent.division.id}
        />
        <StatCard label="Locator" value={agent.isLocator ? "Yes" : "No"} />
        {agent.isCeo !== null && (
          <StatCard
            label="Corporation CEO"
            value={agent.isCeo ? "Yes" : "No"}
          />
        )}
        {agent.startDate && (
          <StatCard label="Started" value={formatDate(agent.startDate)} />
        )}
      </SimpleGrid>

      <Stack gap="sm">
        <SectionHeading icon={<IconMapPin size={18} />}>
          Location
        </SectionHeading>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
          <StatCard
            label="Station"
            value={
              <StationAnchor stationId={station.stationId}>
                {station.name}
              </StationAnchor>
            }
          />
          {station.solarSystemId !== null && (
            <StatCard
              label="System"
              value={
                <Group gap="xs" wrap="nowrap">
                  {station.securityStatus !== null && (
                    <SolarSystemSecurityStatusBadge
                      securityStatus={station.securityStatus}
                      size="sm"
                    />
                  )}
                  <SolarSystemAnchor solarSystemId={station.solarSystemId}>
                    {station.solarSystemName ?? station.solarSystemId}
                  </SolarSystemAnchor>
                </Group>
              }
              sub={
                station.regionId === null ? undefined : (
                  <RegionAnchor regionId={station.regionId} size="xs">
                    {station.regionName ?? station.regionId}
                  </RegionAnchor>
                )
              }
            />
          )}
          {inSpace && (
            <>
              <StatCard
                label="In space at"
                value={
                  <DungeonAnchor dungeonId={inSpace.dungeon.id}>
                    {inSpace.dungeon.name ?? `Dungeon ${inSpace.dungeon.id}`}
                  </DungeonAnchor>
                }
                sub={
                  <SolarSystemAnchor
                    solarSystemId={inSpace.solarSystem.id}
                    size="xs"
                  >
                    {inSpace.solarSystem.name ?? inSpace.solarSystem.id}
                  </SolarSystemAnchor>
                }
              />
              <StatCard
                label="Aboard"
                value={
                  <EntityLine
                    avatar={<TypeAvatar typeId={inSpace.type.id} size="sm" />}
                  >
                    <TypeAnchor typeId={inSpace.type.id}>
                      {inSpace.type.name ?? inSpace.type.id}
                    </TypeAnchor>
                  </EntityLine>
                }
              />
            </>
          )}
        </SimpleGrid>
      </Stack>

      {agent.researchSkills.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconId size={18} />}>
            Research fields
          </SectionHeading>
          <Paper withBorder radius="md" p="sm">
            <Group gap="md">
              {agent.researchSkills.map((skill) => (
                <EntityLine
                  key={skill.id}
                  avatar={<TypeAvatar typeId={skill.id} size="sm" />}
                >
                  <TypeAnchor typeId={skill.id}>
                    {skill.name ?? skill.id}
                  </TypeAnchor>
                </EntityLine>
              ))}
            </Group>
          </Paper>
        </Stack>
      )}
    </Stack>
  );
}

/** The viewer's own character: wallet, skill points, location, training. */
function CapsuleerStatus({ characterId }: Readonly<{ characterId: number }>) {
  const authenticatedCharacter = useAuthenticatedCharacter(characterId);
  const { data: walletBalance, isAllowed: canReadWallet } =
    useCharacterWalletBalance(characterId);
  const { data: skills, hasToken: canReadSkills } =
    useCharacterSkills(characterId);
  if (!authenticatedCharacter || authenticatedCharacter.sessionExpired) {
    return null;
  }
  return (
    <Stack gap="sm">
      <SectionHeading icon={<IconUserCircle size={18} />}>
        Your character
      </SectionHeading>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        {canReadWallet && (
          <StatCard
            label="Wallet"
            value={<ISKAmount span fw={600} amount={walletBalance?.data} />}
          />
        )}
        {canReadSkills && (
          <StatCard
            label="Skill points"
            value={
              <Group gap={6} wrap="nowrap">
                <TypeAvatar typeId={SKILL_POINTS_TYPE_ID} size={16} />
                {skills ? formatInteger(skills.data.total_sp) : "—"} SP
              </Group>
            }
          />
        )}
      </SimpleGrid>
      <CharacterLocationCard characterId={characterId} />
      <CharacterSkillTrainingCard characterId={characterId} />
    </Stack>
  );
}

function npcBadgeLabel(record: CharacterRecord | null, isNpc: boolean) {
  if (record?.agent) {
    return record.agent.researchSkills.length > 0 ? "Research agent" : "Agent";
  }
  return isNpc ? "NPC" : undefined;
}

export default function CharacterPage({
  characterId,
  esi,
  record,
}: Readonly<PageProps>) {
  const selectedCharacter = useSelectedCharacter();
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(CHARACTER_PAGE_TABS)
      .withDefault(DEFAULT_CHARACTER_PAGE_TAB)
      .withOptions({ history: "replace" }),
  );
  const { data: liveCharacter } = useEsiCharacter(characterId);
  const { data: history, isLoading: historyLoading } =
    useGetCharactersCharacterIdCorporationhistory(characterId);
  const zkillEntity = useMemo(
    () => ({ kind: "character" as const, id: characterId }),
    [characterId],
  );
  const zkill = useZkillboardStats(zkillEntity);
  const clientClock = useSyncExternalStore(
    subscribeToNothing,
    getClientNow,
    getServerNow,
  );
  // "Now" for ages and tenures: the server card's timestamp, so the server
  // render and hydration agree; the browser's clock only without one.
  const now = esi?.readAt ?? clientClock;

  const identity = useMemo(
    () => resolveIdentity(liveCharacter?.data, esi, record),
    [liveCharacter?.data, esi, record],
  );
  const stints = useMemo(
    () => toStints(history?.data ?? [], now),
    [history?.data, now],
  );
  const employment = useMemo(() => summarizeEmployment(stints), [stints]);
  const killEfficiency = iskEfficiency(
    zkill.data?.iskDestroyed,
    zkill.data?.iskLost,
  );

  const isNpc = isNpcCharacterId(characterId);
  const badge = npcBadgeLabel(record, isNpc);
  const agent = record?.agent ?? null;
  const ceoOf = record?.ceoOf ?? [];
  const founded = record?.founded ?? [];

  const visibleTabs: Record<CharacterPageTab, boolean> = {
    overview: true,
    biography: Boolean(identity.description),
    history: !isNpc,
    agent: agent !== null,
    killboard: !isNpc,
  };
  const selectedTab = visibleTabs[activeTab]
    ? activeTab
    : DEFAULT_CHARACTER_PAGE_TAB;

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <HeroCard
          artwork={
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
          }
        >
          <Breadcrumbs fz="sm">
            {identity.alliance && (
              <AllianceAnchor allianceId={identity.alliance.id} size="sm">
                {identity.alliance.name ?? (
                  <AllianceName span allianceId={identity.alliance.id} />
                )}
              </AllianceAnchor>
            )}
            {identity.corporation && (
              <CorporationAnchor
                corporationId={identity.corporation.id}
                size="sm"
              >
                {identity.corporation.name ?? (
                  <CorporationName
                    span
                    corporationId={identity.corporation.id}
                  />
                )}
              </CorporationAnchor>
            )}
            <Text size="sm">{identity.name ?? characterId}</Text>
          </Breadcrumbs>
          {identity.title && (
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              {/* Titles are EVE markup; show the text. */}
              {identity.title.replace(/<[^<>]*>/g, "").trim()}
            </Text>
          )}
          <Group gap="sm" align="center">
            <Title order={2}>
              {identity.name ?? `Character ${characterId}`}
            </Title>
            {badge && <Badge variant="light">{badge}</Badge>}
            {identity.securityStatus !== null && (
              <Badge
                variant="light"
                color={securityStatusColor(identity.securityStatus)}
              >
                {identity.securityStatus.toFixed(1)}
              </Badge>
            )}
            {selectedCharacter && (
              <OpenInformationWindowActionIcon
                characterId={selectedCharacter.characterId}
                entityId={characterId}
              />
            )}
          </Group>

          <Group gap="xl">
            {identity.birthday && now && (
              <HeroStat label="Age" value={formatAge(identity.birthday, now)} />
            )}
            {employment.corporations > 0 && (
              <HeroStat
                label="Corporations"
                value={formatInteger(employment.corporations)}
              />
            )}
            {employment.current && (
              <HeroStat
                label="In corporation for"
                value={formatDays(employment.current.days)}
              />
            )}
            {agent && <HeroStat label="Agent level" value={agent.level} />}
            {/* zKillboard loads in the browser: hold the slot while it does,
                so the stat row does not shift when it arrives. */}
            {!isNpc && (zkill.isLoading || killEfficiency !== null) && (
              <HeroStat
                label="ISK efficiency"
                value={
                  killEfficiency === null ? (
                    <Skeleton h="1.2em" w="5ch" />
                  ) : (
                    formatPercent(killEfficiency)
                  )
                }
              />
            )}
          </Group>

          <Group gap="xs">
            {EXTERNAL_LINKS.map((link) => (
              <Button
                key={link.label}
                component={Link}
                href={`${link.href}${characterId}`}
                target="_blank"
                rel="noopener noreferrer"
                size="xs"
                leftSection={<IconExternalLink size={14} />}
              >
                {link.label}
              </Button>
            ))}
          </Group>
        </HeroCard>

        <Tabs
          value={selectedTab}
          onChange={(value) => {
            if (isCharacterPageTab(value)) void setActiveTab(value);
          }}
          variant="outline"
          keepMounted={false}
        >
          <Tabs.List>
            <Tabs.Tab
              value="overview"
              leftSection={<IconInfoCircle size={16} />}
            >
              Overview
            </Tabs.Tab>
            {visibleTabs.biography && (
              <Tabs.Tab
                value="biography"
                leftSection={<IconUserCircle size={16} />}
              >
                Biography
              </Tabs.Tab>
            )}
            {visibleTabs.history && (
              <Tabs.Tab
                value="history"
                leftSection={<IconBriefcase size={16} />}
              >
                Employment History
                {employment.stints > 0 &&
                  ` (${formatInteger(employment.stints)})`}
              </Tabs.Tab>
            )}
            {visibleTabs.agent && (
              <Tabs.Tab value="agent" leftSection={<IconId size={16} />}>
                Agent
              </Tabs.Tab>
            )}
            {visibleTabs.killboard && (
              <Tabs.Tab value="killboard" leftSection={<IconSkull size={16} />}>
                Killboard
              </Tabs.Tab>
            )}
          </Tabs.List>

          <Tabs.Panel value="overview" pt="lg">
            <Stack gap="lg">
              <Stack gap="sm">
                <SectionHeading icon={<IconId size={18} />}>
                  Identity
                </SectionHeading>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                  <StatCard label="Character ID" value={characterId} />
                  {identity.birthday && (
                    <StatCard
                      label="Born"
                      value={formatDate(identity.birthday)}
                      sub={
                        now
                          ? `${formatAge(identity.birthday, now)} ago`
                          : undefined
                      }
                    />
                  )}
                  {identity.gender && (
                    <StatCard
                      label="Gender"
                      value={
                        <Text span tt="capitalize" inherit>
                          {identity.gender}
                        </Text>
                      }
                    />
                  )}
                  {identity.raceId !== undefined && (
                    <StatCard
                      label="Race"
                      value={
                        <RaceAnchor raceId={identity.raceId}>
                          <RaceName span raceId={identity.raceId} />
                        </RaceAnchor>
                      }
                    />
                  )}
                  {identity.bloodlineId !== undefined && (
                    <StatCard
                      label="Bloodline"
                      value={
                        <BloodlineAnchor bloodlineId={identity.bloodlineId}>
                          <BloodlineName bloodlineId={identity.bloodlineId} />
                        </BloodlineAnchor>
                      }
                      sub={
                        record?.ancestry?.name
                          ? `${record.ancestry.name} ancestry`
                          : undefined
                      }
                    />
                  )}
                  {identity.securityStatus !== null && (
                    <StatCard
                      label="Security status"
                      value={
                        <Text
                          span
                          inherit
                          c={securityStatusColor(identity.securityStatus)}
                        >
                          {identity.securityStatus.toFixed(2)}
                        </Text>
                      }
                    />
                  )}
                  {identity.achievementScore !== null && (
                    <StatCard
                      label="Achievement score"
                      value={formatInteger(identity.achievementScore)}
                    />
                  )}
                  {record?.isUnique && (
                    <StatCard label="Name" value="Unique" sub="SDE" />
                  )}
                </SimpleGrid>
              </Stack>

              <Stack gap="sm">
                <SectionHeading icon={<IconUsers size={18} />}>
                  Affiliations
                </SectionHeading>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                  {identity.corporation && (
                    <StatCard
                      label="Corporation"
                      value={
                        <CorporationLine corporation={identity.corporation} />
                      }
                      sub={
                        employment.current
                          ? `Since ${formatDate(employment.current.start)}`
                          : undefined
                      }
                    />
                  )}
                  <StatCard
                    label="Alliance"
                    value={
                      identity.alliance ? (
                        <AllianceLine alliance={identity.alliance} />
                      ) : (
                        "Not in an alliance"
                      )
                    }
                  />
                  {identity.factionId !== null && (
                    <StatCard
                      label="Faction"
                      value={
                        <FactionLine
                          faction={{ id: identity.factionId, name: null }}
                        />
                      }
                    />
                  )}
                  {ceoOf.length > 0 && (
                    <StatCard
                      label="CEO of"
                      value={<CorporationList corporations={ceoOf} />}
                    />
                  )}
                  {founded.length > 0 && (
                    <StatCard
                      label="Founded"
                      value={<CorporationList corporations={founded} />}
                    />
                  )}
                </SimpleGrid>
              </Stack>

              {employment.stints > 0 && (
                <EmploymentSummary summary={employment} />
              )}

              {agent && (
                <Stack gap="sm">
                  <SectionHeading icon={<IconId size={18} />}>
                    Agent
                  </SectionHeading>
                  <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                    <StatCard label="Level" value={`Level ${agent.level}`} />
                    <StatCard
                      label="Division"
                      value={agent.division.name ?? agent.division.id}
                    />
                    <StatCard
                      label="Station"
                      value={
                        <StationAnchor stationId={agent.station.stationId}>
                          {agent.station.name}
                        </StationAnchor>
                      }
                    />
                  </SimpleGrid>
                </Stack>
              )}

              {!isNpc && (
                <Stack gap="sm">
                  <SectionHeading icon={<IconSkull size={18} />}>
                    Killboard
                  </SectionHeading>
                  {zkill.isError ? (
                    <Text size="sm" c="dimmed">
                      zKillboard did not answer. Try again later.
                    </Text>
                  ) : (
                    <KillboardSummaryCards
                      entity={zkillEntity}
                      stats={zkill.data}
                      isLoading={zkill.isLoading}
                    />
                  )}
                </Stack>
              )}

              <CapsuleerStatus characterId={characterId} />
            </Stack>
          </Tabs.Panel>

          {visibleTabs.biography && identity.description && (
            <Tabs.Panel value="biography" pt="lg">
              <Paper withBorder radius="md" p="md">
                <MailMessageViewer
                  content={sanitizeFormattedEveString(identity.description)}
                />
              </Paper>
            </Tabs.Panel>
          )}

          {visibleTabs.history && (
            <Tabs.Panel value="history" pt="lg">
              <Stack gap="lg">
                {employment.stints > 0 && (
                  <EmploymentSummary summary={employment} />
                )}
                <EmploymentHistory stints={stints} isLoading={historyLoading} />
              </Stack>
            </Tabs.Panel>
          )}

          {visibleTabs.agent && agent && (
            <Tabs.Panel value="agent" pt="lg">
              <AgentPanel agent={agent} />
            </Tabs.Panel>
          )}

          {visibleTabs.killboard && (
            <Tabs.Panel value="killboard" pt="lg">
              <KillboardTab
                entity={zkillEntity}
                stats={zkill.data}
                isLoading={zkill.isLoading}
                isError={zkill.isError}
              />
            </Tabs.Panel>
          )}
        </Tabs>
      </Stack>
    </Container>
  );
}

/** Corporations, stints and tenures, from the employment history. */
function EmploymentSummary({
  summary,
}: Readonly<{ summary: EmploymentSummaryData }>) {
  return (
    <Stack gap="sm">
      <SectionHeading icon={<IconBriefcase size={18} />}>
        Employment
      </SectionHeading>
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
        <StatCard
          label="Corporations"
          value={formatInteger(summary.corporations)}
          sub={
            summary.stints === summary.corporations
              ? undefined
              : `${formatInteger(summary.stints)} stints`
          }
        />
        {summary.current && (
          <StatCard
            label="Current tenure"
            value={formatDays(summary.current.days)}
          />
        )}
        {summary.averageDays !== null && (
          <StatCard
            label="Average tenure"
            value={formatDays(summary.averageDays)}
          />
        )}
        {summary.longest && (
          <StatCard
            label="Longest stint"
            value={formatDays(summary.longest.days)}
            sub={
              <CorporationAnchor
                corporationId={summary.longest.corporationId}
                size="xs"
              >
                <CorporationName
                  span
                  inherit
                  corporationId={summary.longest.corporationId}
                />
              </CorporationAnchor>
            }
          />
        )}
      </SimpleGrid>
    </Stack>
  );
}
