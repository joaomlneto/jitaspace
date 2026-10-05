"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import Link from "next/link";
import {
  Anchor,
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
  IconBuildingStore,
  IconBuildingWarehouse,
  IconChartPie,
  IconExternalLink,
  IconFileText,
  IconHistory,
  IconInfoCircle,
  IconSkull,
  IconSwords,
  IconUserCircle,
  IconWorld,
} from "@tabler/icons-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import type { CorporationsDetail } from "@jitaspace/esi-client";
import {
  AllianceName,
  CharacterAnchor,
  CharacterName,
  CorporationName,
  FactionAnchor,
  FactionName,
  RegionAnchor,
  SolarSystemAnchor,
  StationAnchor,
  StationName,
} from "@jitaspace/eve-components";
import { useCorporation, useSelectedCharacter } from "@jitaspace/hooks";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import {
  AllianceAnchor,
  AllianceAvatar,
  CharacterAvatar,
  CorporationAnchor,
  CorporationAvatar,
  FactionAvatar,
  ISKAmount,
  RaceAnchor,
  SolarSystemSecurityStatusBadge,
} from "@jitaspace/ui";

import type { CorporationPageTab } from "./tabs";
import type { CorporationPageData, NamedRef } from "./types";
import { OpenInformationWindowActionIcon } from "~/components/ActionIcon";
import { AgentsTable } from "~/components/Agents";
import {
  HeroCard,
  HeroStat,
  SectionHeading,
  StatCard,
} from "~/components/EntityPage";
import { MailMessageViewer } from "~/components/EveMail";
import { CorporationAllianceHistoryTimeline } from "~/components/Timeline";
import {
  toWarRow,
  WarsTab,
  WarSummaryCards,
} from "~/components/Wars/EntityWars";
import {
  iskEfficiency,
  KillboardSummaryCards,
  KillboardTab,
  useZkillboardStats,
} from "~/components/Zkillboard";
import {
  formatAge,
  formatDate,
  formatDecimal,
  formatInteger,
  formatPercent,
} from "~/lib/format";
import { lpStorePath } from "~/lib/lpStorePath";
import { EconomyTab } from "./EconomyTab";
import { isNpcCorporationId } from "./ids";
import { StationsTab } from "./StationsTab";
import { useCorporationTables } from "./tables";
import {
  CORPORATION_PAGE_TABS,
  CORPORATION_TABLE_TABS,
  DEFAULT_CORPORATION_PAGE_TAB,
  isCorporationPageTab,
} from "./tabs";

export interface PageProps {
  corporationId: number;
  /** Null when our database has no row for the corporation or is unavailable. */
  profile: CorporationPageData | null;
}

const EXTERNAL_LINKS = [
  { label: "DOTLAN EveMaps", href: "https://evemaps.dotlan.net/corp/" },
  { label: "EveWho", href: "https://evewho.com/corporation/" },
  { label: "zKillboard", href: "https://zkillboard.com/corporation/" },
] as const;

const SIZE_LABELS: Record<string, string> = {
  T: "Tiny",
  S: "Small",
  M: "Medium",
  L: "Large",
  H: "Huge",
};

const EXTENT_LABELS: Record<string, string> = {
  G: "Global",
  N: "National",
  R: "Regional",
  C: "Constellation",
  L: "Local",
};

/** A stable empty table, so a loading tab does not hand DataTable a new array per render. */
const NO_ROWS: never[] = [];

function EntityLine({
  avatar,
  children,
}: Readonly<{ avatar: ReactNode; children: ReactNode }>) {
  return (
    <Group gap="xs" wrap="nowrap">
      {avatar}
      {children}
    </Group>
  );
}

function CharacterLine({ character }: Readonly<{ character: NamedRef }>) {
  return (
    <EntityLine
      avatar={<CharacterAvatar characterId={character.id} size="sm" />}
    >
      <CharacterAnchor characterId={character.id}>
        {character.name ?? <CharacterName span characterId={character.id} />}
      </CharacterAnchor>
    </EntityLine>
  );
}

function CorporationLine({ corporation }: Readonly<{ corporation: NamedRef }>) {
  return (
    <EntityLine
      avatar={<CorporationAvatar corporationId={corporation.id} size="sm" />}
    >
      <CorporationAnchor corporationId={corporation.id}>
        {corporation.name ?? (
          <CorporationName span corporationId={corporation.id} />
        )}
      </CorporationAnchor>
    </EntityLine>
  );
}

function AllianceLine({ alliance }: Readonly<{ alliance: NamedRef }>) {
  return (
    <EntityLine avatar={<AllianceAvatar allianceId={alliance.id} size="sm" />}>
      <AllianceAnchor allianceId={alliance.id}>
        {alliance.name ?? <AllianceName span allianceId={alliance.id} />}
      </AllianceAnchor>
    </EntityLine>
  );
}

function FactionLine({ faction }: Readonly<{ faction: NamedRef }>) {
  return (
    <EntityLine avatar={<FactionAvatar factionId={faction.id} size="sm" />}>
      <FactionAnchor factionId={faction.id}>
        {faction.name ?? <FactionName span factionId={faction.id} />}
      </FactionAnchor>
    </EntityLine>
  );
}

/** A reference ESI gave by id, named from our row when the ids agree. */
function named(
  id: number | null | undefined,
  stored: NamedRef | null | undefined,
): NamedRef | null {
  if (id == null) return null;
  return { id, name: stored?.id === id ? stored.name : null };
}

/**
 * Who the corporation is. ESI wins once it answers: members, CEO, alliance and
 * tax change between our refreshes. The server render, and so hydration, uses
 * our row, since react-query starts empty on both.
 */
function resolveIdentity(
  profile: CorporationPageData | null,
  esi: CorporationsDetail | undefined,
) {
  const homeStationId = esi?.home_station_id ?? profile?.homeStation?.id;
  return {
    name: esi?.name ?? profile?.name,
    ticker: esi?.ticker ?? profile?.ticker,
    description: esi?.description ?? profile?.description ?? null,
    url: esi?.url ?? profile?.url ?? null,
    memberCount: esi?.member_count ?? profile?.memberCount,
    taxRate: esi ? esi.tax_rates.isk / 100 : profile?.taxRate,
    lpTaxRate: esi ? esi.tax_rates.loyalty_point / 100 : undefined,
    dateFounded: esi?.date_founded ?? profile?.dateFounded ?? null,
    ceo: esi ? named(esi.ceo_id, profile?.ceo) : (profile?.ceo ?? null),
    creator: esi
      ? named(esi.creator_id, profile?.creator)
      : (profile?.creator ?? null),
    alliance: esi
      ? named(esi.alliance_id, profile?.alliance)
      : (profile?.alliance ?? null),
    enlistedFaction: esi
      ? named(esi.enlisted_faction_id, profile?.enlistedFaction)
      : (profile?.enlistedFaction ?? null),
    homeStation: named(homeStationId, profile?.homeStation),
    shares: esi ? String(esi.shares) : (profile?.shares ?? null),
    warEligible: esi?.war_eligible ?? profile?.warEligible ?? null,
    isClosed: esi?.state === "closed",
    friendlyFire: esi?.friendly_fire,
  };
}

/** Which tabs this corporation has anything to show in. */
function visibleTabsFor(
  profile: CorporationPageData | null,
  isNpc: boolean,
  hasDescription: boolean,
): Record<CorporationPageTab, boolean> {
  const npc = profile?.npc;
  const hasEconomy =
    npc != null &&
    (npc.divisions.length > 0 ||
      npc.investors.length > 0 ||
      npc.investedIn.length > 0 ||
      npc.exchangeRates.length > 0 ||
      (profile?.counts.trades ?? 0) > 0);
  return {
    overview: true,
    description: hasDescription,
    // NPC corporations never join alliances.
    history: !isNpc,
    stations: (profile?.counts.stations ?? 0) > 0,
    agents: (profile?.counts.agents ?? 0) > 0,
    economy: hasEconomy,
    wars: (profile?.warSummary.total ?? 0) > 0,
    killboard: true,
  };
}

function NpcDetails({
  npc,
  corporationName,
}: Readonly<{
  npc: NonNullable<CorporationPageData["npc"]>;
  corporationName: string | undefined;
}>) {
  return (
    <Stack gap="sm">
      <SectionHeading icon={<IconWorld size={18} />}>
        NPC corporation
      </SectionHeading>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
        {npc.faction && (
          <StatCard
            label="Faction"
            value={<FactionLine faction={npc.faction} />}
          />
        )}
        {npc.headquarters && (
          <StatCard
            label="Headquarters"
            value={
              <Group gap="xs" wrap="nowrap">
                <SolarSystemSecurityStatusBadge
                  securityStatus={npc.headquarters.securityStatus}
                  size="sm"
                />
                <SolarSystemAnchor
                  solarSystemId={npc.headquarters.solarSystemId}
                >
                  {npc.headquarters.name}
                </SolarSystemAnchor>
              </Group>
            }
            sub={
              npc.headquarters.regionId === null ? undefined : (
                <RegionAnchor regionId={npc.headquarters.regionId} size="xs">
                  {npc.headquarters.regionName ?? npc.headquarters.regionId}
                </RegionAnchor>
              )
            }
          />
        )}
        {npc.race && (
          <StatCard
            label="Race"
            value={
              <RaceAnchor raceId={npc.race.id}>
                {npc.race.name ?? npc.race.id}
              </RaceAnchor>
            }
          />
        )}
        {npc.allowedRaces.length > 0 && (
          <StatCard
            label="Recruits"
            value={npc.allowedRaces
              .map((race) => race.name ?? race.id)
              .join(", ")}
          />
        )}
        {npc.mainActivity && (
          <StatCard
            label="Activity"
            value={npc.mainActivity}
            sub={
              npc.secondaryActivity
                ? `Also ${npc.secondaryActivity}`
                : undefined
            }
          />
        )}
        {(npc.size ?? npc.extent) && (
          <StatCard
            label="Size & reach"
            value={[
              npc.size && (SIZE_LABELS[npc.size] ?? npc.size),
              npc.extent && (EXTENT_LABELS[npc.extent] ?? npc.extent),
            ]
              .filter(Boolean)
              .join(" · ")}
            sub={
              npc.sizeFactor === null
                ? undefined
                : `Size factor ${formatDecimal(npc.sizeFactor)}`
            }
          />
        )}
        {npc.friend && (
          <StatCard
            label="Friend"
            value={<CorporationLine corporation={npc.friend} />}
          />
        )}
        {npc.enemy && (
          <StatCard
            label="Enemy"
            value={<CorporationLine corporation={npc.enemy} />}
          />
        )}
        {npc.memberLimit !== null && (
          <StatCard
            label="Member limit"
            value={formatInteger(npc.memberLimit)}
          />
        )}
        {npc.minSecurity !== null && (
          <StatCard
            label="Minimum security status"
            value={formatDecimal(npc.minSecurity)}
          />
        )}
        {npc.minimumJoinStanding !== null && (
          <StatCard
            label="Minimum standing to join"
            value={formatDecimal(npc.minimumJoinStanding)}
          />
        )}
        {npc.initialPrice !== null && (
          <StatCard
            label="Initial share price"
            value={<ISKAmount amount={npc.initialPrice} />}
          />
        )}
        {npc.lpOffers > 0 && corporationName && (
          <StatCard
            label="Loyalty point store"
            value={
              <Anchor component={Link} href={lpStorePath(corporationName)}>
                {formatInteger(npc.lpOffers)} offers
              </Anchor>
            }
          />
        )}
      </SimpleGrid>
    </Stack>
  );
}

export default function CorporationPage({
  corporationId,
  profile,
}: Readonly<PageProps>) {
  const character = useSelectedCharacter();
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(CORPORATION_PAGE_TABS)
      .withDefault(DEFAULT_CORPORATION_PAGE_TAB)
      .withOptions({ history: "replace" }),
  );
  const { data: esiCorporation } = useCorporation(corporationId);
  const zkillEntity = useMemo(
    () => ({ kind: "corporation" as const, id: corporationId }),
    [corporationId],
  );
  const zkill = useZkillboardStats(zkillEntity);
  // "Now" for time-relative text: the server read's own timestamp, so the
  // server render and hydration agree.
  const now = profile?.readAt;

  const identity = useMemo(
    () => resolveIdentity(profile, esiCorporation?.data),
    [profile, esiCorporation?.data],
  );
  const isNpc = isNpcCorporationId(corporationId);
  const visibleTabs = visibleTabsFor(
    profile,
    isNpc,
    Boolean(identity.description),
  );
  // `?tab=wars` on a corporation with none would select a tab that is not
  // rendered, leaving the page blank; show the overview instead.
  const selectedTab = visibleTabs[activeTab]
    ? activeTab
    : DEFAULT_CORPORATION_PAGE_TAB;

  const tablesQuery = useCorporationTables(
    corporationId,
    profile !== null && CORPORATION_TABLE_TABS.has(selectedTab),
  );
  const tables = tablesQuery.data;
  const tablesLoading = tablesQuery.isPending;
  const warRows = useMemo(
    () => (tables?.wars ?? NO_ROWS).map(toWarRow),
    [tables?.wars],
  );
  const killEfficiency = iskEfficiency(
    zkill.data?.iskDestroyed,
    zkill.data?.iskLost,
  );
  const npc = profile?.npc ?? null;
  const warSummary = profile?.warSummary;

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <HeroCard
          artwork={
            <CorporationAvatar
              corporationId={corporationId}
              size={128}
              radius="sm"
            />
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
            {npc?.faction && (
              <FactionAnchor factionId={npc.faction.id} size="sm">
                {npc.faction.name}
              </FactionAnchor>
            )}
            <Text size="sm">{identity.name ?? corporationId}</Text>
          </Breadcrumbs>
          <Group gap="sm" align="center">
            <Title order={2}>
              {identity.name ?? `Corporation ${corporationId}`}
            </Title>
            {identity.ticker && (
              <Badge variant="light" size="lg">
                {`[${identity.ticker}]`}
              </Badge>
            )}
            {isNpc && (
              <Badge color="grape" variant="light">
                NPC
              </Badge>
            )}
            {identity.isClosed && (
              <Badge color="red" variant="light">
                Closed
              </Badge>
            )}
            {character !== null && (
              <OpenInformationWindowActionIcon
                characterId={character.characterId}
                entityId={corporationId}
              />
            )}
          </Group>

          {(identity.ceo ?? identity.alliance) && (
            <Group gap="xs" align="center">
              {identity.ceo && (
                <>
                  <Text size="sm" c="dimmed">
                    CEO
                  </Text>
                  <CharacterAnchor characterId={identity.ceo.id}>
                    {identity.ceo.name ?? (
                      <CharacterName span characterId={identity.ceo.id} />
                    )}
                  </CharacterAnchor>
                </>
              )}
              {identity.ceo && identity.alliance && <Text c="dimmed">·</Text>}
              {identity.alliance && (
                <>
                  <Text size="sm" c="dimmed">
                    Alliance
                  </Text>
                  <AllianceAnchor allianceId={identity.alliance.id}>
                    {identity.alliance.name ?? (
                      <AllianceName span allianceId={identity.alliance.id} />
                    )}
                  </AllianceAnchor>
                </>
              )}
            </Group>
          )}

          <Group gap="xl">
            {identity.memberCount !== undefined && (
              <HeroStat
                label="Members"
                value={formatInteger(identity.memberCount)}
              />
            )}
            {identity.dateFounded && (
              <HeroStat
                label="Founded"
                value={formatDate(identity.dateFounded)}
              />
            )}
            {identity.taxRate !== undefined && (
              <HeroStat label="Tax" value={formatPercent(identity.taxRate)} />
            )}
            {profile && profile.counts.stations > 0 && (
              <HeroStat
                label="Stations"
                value={formatInteger(profile.counts.stations)}
              />
            )}
            {profile && profile.counts.agents > 0 && (
              <HeroStat
                label="Agents"
                value={formatInteger(profile.counts.agents)}
              />
            )}
            {warSummary && warSummary.ongoing > 0 && (
              <HeroStat
                label="Ongoing wars"
                value={formatInteger(warSummary.ongoing)}
              />
            )}
            {/* zKillboard loads in the browser: hold the slot while it does,
                so the stat row does not shift when it arrives. */}
            {(zkill.isLoading || killEfficiency !== null) && (
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
                href={`${link.href}${corporationId}`}
                target="_blank"
                rel="noopener noreferrer"
                size="xs"
                leftSection={<IconExternalLink size={14} />}
              >
                {link.label}
              </Button>
            ))}
            {npc && npc.lpOffers > 0 && identity.name && (
              <Button
                component={Link}
                href={lpStorePath(identity.name)}
                size="xs"
                variant="light"
                leftSection={<IconBuildingStore size={14} />}
              >
                LP Store
              </Button>
            )}
          </Group>
        </HeroCard>

        <Tabs
          value={selectedTab}
          onChange={(value) => {
            if (isCorporationPageTab(value)) void setActiveTab(value);
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
            {visibleTabs.description && (
              <Tabs.Tab
                value="description"
                leftSection={<IconFileText size={16} />}
              >
                Description
              </Tabs.Tab>
            )}
            {visibleTabs.history && (
              <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
                Alliance History
              </Tabs.Tab>
            )}
            {visibleTabs.stations && profile && (
              <Tabs.Tab
                value="stations"
                leftSection={<IconBuildingWarehouse size={16} />}
              >
                Stations ({formatInteger(profile.counts.stations)})
              </Tabs.Tab>
            )}
            {visibleTabs.agents && profile && (
              <Tabs.Tab
                value="agents"
                leftSection={<IconUserCircle size={16} />}
              >
                Agents ({formatInteger(profile.counts.agents)})
              </Tabs.Tab>
            )}
            {visibleTabs.economy && (
              <Tabs.Tab
                value="economy"
                leftSection={<IconChartPie size={16} />}
              >
                Economy
              </Tabs.Tab>
            )}
            {visibleTabs.wars && warSummary && (
              <Tabs.Tab value="wars" leftSection={<IconSwords size={16} />}>
                Wars ({formatInteger(warSummary.total)})
              </Tabs.Tab>
            )}
            <Tabs.Tab value="killboard" leftSection={<IconSkull size={16} />}>
              Killboard
            </Tabs.Tab>
          </Tabs.List>

          {tablesQuery.isError && CORPORATION_TABLE_TABS.has(selectedTab) && (
            <Text c="dimmed" pt="lg">
              Could not load this corporation&apos;s tables. Try again later.
            </Text>
          )}

          <Tabs.Panel value="overview" pt="lg">
            <Stack gap="lg">
              <Stack gap="sm">
                <SectionHeading icon={<IconInfoCircle size={18} />}>
                  Identity &amp; Leadership
                </SectionHeading>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                  <StatCard label="Corporation ID" value={corporationId} />
                  {identity.ticker && (
                    <StatCard label="Ticker" value={`[${identity.ticker}]`} />
                  )}
                  {identity.dateFounded && (
                    <StatCard
                      label="Founded"
                      value={formatDate(identity.dateFounded)}
                      sub={
                        now
                          ? `${formatAge(identity.dateFounded, now)} ago`
                          : undefined
                      }
                    />
                  )}
                  {identity.ceo && (
                    <StatCard
                      label="CEO"
                      value={<CharacterLine character={identity.ceo} />}
                    />
                  )}
                  {identity.creator && (
                    <StatCard
                      label="Creator"
                      value={<CharacterLine character={identity.creator} />}
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
                  {identity.enlistedFaction && (
                    <StatCard
                      label="Faction Warfare"
                      value={<FactionLine faction={identity.enlistedFaction} />}
                    />
                  )}
                  {identity.memberCount !== undefined && (
                    <StatCard
                      label="Members"
                      value={formatInteger(identity.memberCount)}
                    />
                  )}
                  {identity.taxRate !== undefined && (
                    <StatCard
                      label="Tax rate"
                      value={formatPercent(identity.taxRate)}
                      sub={
                        identity.lpTaxRate === undefined
                          ? undefined
                          : `${formatPercent(identity.lpTaxRate)} on loyalty points`
                      }
                    />
                  )}
                  {identity.homeStation && (
                    <StatCard
                      label="Home station"
                      value={
                        <StationAnchor stationId={identity.homeStation.id}>
                          {identity.homeStation.name ?? (
                            <StationName
                              span
                              stationId={identity.homeStation.id}
                            />
                          )}
                        </StationAnchor>
                      }
                    />
                  )}
                  {identity.shares !== null && (
                    <StatCard
                      label="Shares"
                      value={formatInteger(Number(identity.shares))}
                    />
                  )}
                  {identity.warEligible !== null && (
                    <StatCard
                      label="War eligible"
                      value={
                        <Badge
                          variant="light"
                          color={identity.warEligible ? "red" : "gray"}
                        >
                          {identity.warEligible ? "Yes" : "No"}
                        </Badge>
                      }
                    />
                  )}
                  {identity.friendlyFire && (
                    <StatCard
                      label="Friendly fire"
                      value={
                        identity.friendlyFire === "legal" ? "Legal" : "Illegal"
                      }
                    />
                  )}
                  {identity.url && /^https?:\/\//i.test(identity.url) && (
                    <StatCard
                      label="Website"
                      value={
                        <Anchor
                          href={identity.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                        >
                          {identity.url
                            .replace(/^https?:\/\//i, "")
                            .replace(/\/$/, "")}
                        </Anchor>
                      }
                    />
                  )}
                </SimpleGrid>
              </Stack>

              {npc && <NpcDetails npc={npc} corporationName={identity.name} />}

              {warSummary && warSummary.total > 0 && (
                <Stack gap="sm">
                  <SectionHeading icon={<IconSwords size={18} />}>
                    War record
                  </SectionHeading>
                  <WarSummaryCards summary={warSummary} />
                </Stack>
              )}

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
            </Stack>
          </Tabs.Panel>

          {visibleTabs.description && identity.description && (
            <Tabs.Panel value="description" pt="lg">
              <Paper withBorder radius="md" p="md">
                <MailMessageViewer
                  content={sanitizeFormattedEveString(identity.description)}
                />
              </Paper>
            </Tabs.Panel>
          )}

          {visibleTabs.history && (
            <Tabs.Panel value="history" pt="lg">
              <CorporationAllianceHistoryTimeline
                corporationId={corporationId}
              />
            </Tabs.Panel>
          )}

          {visibleTabs.stations && (
            <Tabs.Panel value="stations" pt="lg">
              <StationsTab
                stations={tables?.stations ?? NO_ROWS}
                isLoading={tablesLoading}
              />
            </Tabs.Panel>
          )}

          {visibleTabs.agents && (
            <Tabs.Panel value="agents" pt="lg">
              {tables ? (
                <AgentsTable
                  agents={tables.agents}
                  agentTypes={tables.agentTypes}
                  agentDivisions={tables.agentDivisions}
                />
              ) : (
                <Skeleton h={400} radius="md" />
              )}
            </Tabs.Panel>
          )}

          {visibleTabs.economy && npc && (
            <Tabs.Panel value="economy" pt="lg">
              <EconomyTab
                npc={npc}
                trades={tables?.trades ?? NO_ROWS}
                tradesLoading={tablesLoading}
              />
            </Tabs.Panel>
          )}

          {visibleTabs.wars && profile && (
            <Tabs.Panel value="wars" pt="lg">
              <WarsTab
                entityKind="corporation"
                rows={warRows}
                isLoading={tablesLoading}
                listed={profile.counts.listedWars}
                summary={profile.warSummary}
              />
            </Tabs.Panel>
          )}

          <Tabs.Panel value="killboard" pt="lg">
            <KillboardTab
              entity={zkillEntity}
              stats={zkill.data}
              isLoading={zkill.isLoading}
              isError={zkill.isError}
            />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
