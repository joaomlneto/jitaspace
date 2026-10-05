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
  Progress,
  SimpleGrid,
  Skeleton,
  Stack,
  Tabs,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconBuildingSkyscraper,
  IconExternalLink,
  IconFlag,
  IconInfoCircle,
  IconSkull,
  IconSwords,
  IconUsersGroup,
} from "@tabler/icons-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import type { GetAlliancesAllianceIdQueryResponse } from "@jitaspace/esi-client";
import {
  CharacterAnchor,
  CharacterName,
  CorporationName,
  FactionAnchor,
  FactionName,
  SolarSystemAnchor,
} from "@jitaspace/eve-components";
import {
  useEsiAllianceInformation,
  useEsiAllianceMemberCorporations,
  useSelectedCharacter,
} from "@jitaspace/hooks";
import {
  AllianceAvatar,
  CharacterAvatar,
  CorporationAnchor,
  CorporationAvatar,
  FactionAvatar,
} from "@jitaspace/ui";

import type { AlliancePageTab } from "./tabs";
import type { AlliancePageData, CompositionEntry } from "./types";
import { OpenInformationWindowActionIcon } from "~/components/ActionIcon";
import {
  HeroCard,
  HeroStat,
  SectionHeading,
  StatCard,
} from "~/components/EntityPage";
import { buildCorporationRows } from "./corporations";
import { CorporationsTab } from "./CorporationsTab";
import {
  formatAge,
  formatDate,
  formatDecimal,
  formatInteger,
  formatPercent,
} from "./format";
import { KillboardSummaryCards, KillboardTab } from "./KillboardTab";
import { SovereigntyTab } from "./SovereigntyTab";
import { useAllianceTables } from "./tables";
import {
  ALLIANCE_PAGE_TABS,
  DEFAULT_ALLIANCE_PAGE_TAB,
  isAlliancePageTab,
} from "./tabs";
import { toWarRow, WarsTab } from "./WarsTab";
import { iskEfficiency, useZkillboardAllianceStats } from "./zkillboard";

export interface PageProps {
  allianceId: number;
  /** Null when our database has no row for the alliance or is unavailable. */
  profile: AlliancePageData | null;
}

const COMPOSITION_COLORS = [
  "blue.6",
  "teal.6",
  "grape.6",
  "orange.6",
  "cyan.6",
  "pink.6",
  "lime.6",
  "indigo.6",
];

const EXTERNAL_LINKS = [
  { label: "DOTLAN EveMaps", href: "https://evemaps.dotlan.net/alliance/" },
  { label: "EveWho", href: "https://evewho.com/alliance/" },
  { label: "zKillboard", href: "https://zkillboard.com/alliance/" },
] as const;

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

function CorporationLine({
  corporationId,
  name,
}: Readonly<{ corporationId: number; name?: string | null }>) {
  return (
    <EntityLine
      avatar={<CorporationAvatar corporationId={corporationId} size="sm" />}
    >
      <CorporationAnchor corporationId={corporationId}>
        {name ?? <CorporationName span corporationId={corporationId} />}
      </CorporationAnchor>
    </EntityLine>
  );
}

function CompositionBar({
  top,
  pilots,
  corporations,
}: Readonly<{
  top: CompositionEntry[];
  pilots: number;
  corporations: number;
}>) {
  if (pilots === 0 || top.length === 0) return null;
  const others = pilots - top.reduce((sum, row) => sum + row.memberCount, 0);

  return (
    <Paper withBorder radius="md" p="sm">
      <Stack gap="sm">
        <Progress.Root size={22}>
          {top.map((row, index) => (
            <Tooltip
              key={row.corporationId}
              label={`${row.name}: ${formatInteger(row.memberCount)} pilots (${formatPercent(row.memberCount / pilots)})`}
            >
              <Progress.Section
                value={(row.memberCount / pilots) * 100}
                color={COMPOSITION_COLORS[index % COMPOSITION_COLORS.length]}
              />
            </Tooltip>
          ))}
          {others > 0 && (
            <Tooltip
              label={`${formatInteger(corporations - top.length)} other corporations: ${formatInteger(others)} pilots (${formatPercent(others / pilots)})`}
            >
              <Progress.Section
                value={(others / pilots) * 100}
                color="dark.3"
              />
            </Tooltip>
          )}
        </Progress.Root>
        <Group gap="md" wrap="wrap">
          {top.map((row, index) => (
            <Group key={row.corporationId} gap={6} wrap="nowrap">
              <Badge
                size="xs"
                circle
                color={COMPOSITION_COLORS[index % COMPOSITION_COLORS.length]}
              >
                {" "}
              </Badge>
              <Text size="xs">
                {row.ticker ? `[${row.ticker}]` : row.name}{" "}
                <Text span c="dimmed" size="xs">
                  {formatPercent(row.memberCount / pilots)}
                </Text>
              </Text>
            </Group>
          ))}
          {others > 0 && (
            <Group gap={6} wrap="nowrap">
              <Badge size="xs" circle color="dark.3">
                {" "}
              </Badge>
              <Text size="xs">
                Others{" "}
                <Text span c="dimmed" size="xs">
                  {formatPercent(others / pilots)}
                </Text>
              </Text>
            </Group>
          )}
        </Group>
      </Stack>
    </Paper>
  );
}

/**
 * Who the alliance is: our row first, since it is what the server rendered
 * and so what hydration expects; ESI fills in what we do not store (the
 * creator), and everything when we have no row.
 */
function resolveIdentity(
  profile: AlliancePageData | null,
  esi: GetAlliancesAllianceIdQueryResponse | undefined,
) {
  if (profile) {
    // Null in our row is a fact (no executor, no militia), not a gap for ESI.
    return {
      name: profile.name,
      ticker: profile.ticker,
      dateFounded: profile.dateFounded,
      executorCorporationId: profile.executorCorporationId,
      creatorCorporationId: profile.creatorCorporationId,
      factionId: profile.factionId,
      creatorId: esi?.creator_id,
      isClosed: profile.isClosed,
    };
  }
  return {
    name: esi?.name,
    ticker: esi?.ticker,
    dateFounded: esi?.date_founded,
    executorCorporationId: esi?.executor_corporation_id ?? null,
    creatorCorporationId: esi?.creator_corporation_id ?? null,
    factionId: esi?.faction_id ?? null,
    creatorId: esi?.creator_id,
    // A closed alliance has no executor; ESI still answers for it.
    isClosed: esi !== undefined && !esi.executor_corporation_id,
  };
}

/** The table tabs: their rows are fetched when one opens. */
const TABLE_TABS = new Set<AlliancePageTab>([
  "corporations",
  "sovereignty",
  "wars",
]);

/** A stable empty table, so a loading tab does not hand DataTable a new array per render. */
const NO_ROWS: never[] = [];

/** Whether the creator corporation is still in the alliance, once we know. */
function describeCreatorMembership(
  stillMember: boolean | undefined,
): string | undefined {
  if (stillMember === undefined) return undefined;
  return stillMember ? "Still a member" : "No longer a member";
}

export default function AlliancePage({
  allianceId,
  profile,
}: Readonly<PageProps>) {
  const character = useSelectedCharacter();
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(ALLIANCE_PAGE_TABS)
      .withDefault(DEFAULT_ALLIANCE_PAGE_TAB)
      .withOptions({ history: "replace" }),
  );
  const { data: esiAlliance } = useEsiAllianceInformation(allianceId);
  const { data: esiMembers, isLoading: esiMembersLoading } =
    useEsiAllianceMemberCorporations(allianceId);
  const zkill = useZkillboardAllianceStats(allianceId);
  // "Now" for time-relative text: the server read's own timestamp, so the
  // server render and hydration agree.
  const now = profile?.readAt;

  const {
    name,
    ticker,
    dateFounded,
    executorCorporationId,
    creatorCorporationId,
    factionId,
    creatorId,
    isClosed,
  } = useMemo(
    () => resolveIdentity(profile, esiAlliance?.data),
    [profile, esiAlliance?.data],
  );

  // Without a database row, ESI's member list is all we have, and it is cheap:
  // ids only. With one, the rows come from `/api/alliance/[allianceId]`.
  const tablesQuery = useAllianceTables(
    allianceId,
    profile !== null && TABLE_TABS.has(activeTab),
  );
  const tables = tablesQuery.data;
  const tablesLoading = profile !== null && tablesQuery.isPending;
  const corporationRows = useMemo(
    () =>
      profile === null || tables
        ? buildCorporationRows({
            corporations: tables?.corporations ?? NO_ROWS,
            esiMemberIds: esiMembers?.data,
            executorCorporationId,
            creatorCorporationId,
          })
        : NO_ROWS,
    [
      profile,
      tables,
      esiMembers?.data,
      executorCorporationId,
      creatorCorporationId,
    ],
  );
  const corporationNames = useMemo(
    () =>
      new Map(
        (tables?.corporations ?? NO_ROWS).map((corporation) => [
          corporation.corporationId,
          corporation.name,
        ]),
      ),
    [tables?.corporations],
  );
  const warRows = useMemo(
    () => (tables?.wars ?? NO_ROWS).map(toWarRow),
    [tables?.wars],
  );
  const corporationSummary = profile?.corporationSummary;
  const sovereigntySummary = profile?.sovereigntySummary;
  const warSummary = profile?.warSummary;
  const composition = profile?.composition ?? NO_ROWS;
  const executorCeo = profile?.executorCeo ?? null;
  const sovereigntySystems = sovereigntySummary?.systems ?? 0;
  const corporationCount = profile
    ? profile.corporationSummary.corporations
    : (esiMembers?.data.length ?? 0);
  const creatorMembership = describeCreatorMembership(
    profile
      ? profile.creatorStillMember
      : corporationRows.length > 0
        ? corporationRows.some((row) => row.isCreator)
        : undefined,
  );

  const hasSovereignty = sovereigntySystems > 0;
  const hasWars = (warSummary?.total ?? 0) > 0;
  const killEfficiency = iskEfficiency(
    zkill.data?.iskDestroyed,
    zkill.data?.iskLost,
  );

  const visibleTabs: Record<AlliancePageTab, boolean> = {
    overview: true,
    corporations: true,
    sovereignty: hasSovereignty,
    wars: hasWars,
    killboard: true,
  };
  // `?tab=wars` on an alliance with none would select a tab that is not
  // rendered, leaving the page blank; show the overview instead.
  const selectedTab = visibleTabs[activeTab]
    ? activeTab
    : DEFAULT_ALLIANCE_PAGE_TAB;

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <HeroCard
          artwork={
            <AllianceAvatar allianceId={allianceId} size={128} radius="sm" />
          }
        >
          <Breadcrumbs fz="sm">
            <Anchor component={Link} href="/alliances" size="sm">
              Alliances
            </Anchor>
            <Text size="sm">{name ?? allianceId}</Text>
          </Breadcrumbs>
          <Group gap="sm" align="center">
            <Title order={2}>{name ?? `Alliance ${allianceId}`}</Title>
            {ticker && (
              <Badge variant="light" size="lg">
                {`<${ticker}>`}
              </Badge>
            )}
            {isClosed && (
              <Badge color="red" variant="light">
                Closed
              </Badge>
            )}
            {character !== null && (
              <OpenInformationWindowActionIcon
                characterId={character.characterId}
                entityId={allianceId}
              />
            )}
          </Group>

          {(executorCorporationId !== null || factionId !== null) && (
            <Group gap="xs" align="center">
              {executorCorporationId !== null && (
                <>
                  <Text size="sm" c="dimmed">
                    Executor
                  </Text>
                  <CorporationAnchor corporationId={executorCorporationId}>
                    {profile?.executorCorporationName ?? (
                      <CorporationName
                        span
                        corporationId={executorCorporationId}
                      />
                    )}
                  </CorporationAnchor>
                </>
              )}
              {executorCorporationId !== null && factionId !== null && (
                <Text c="dimmed">·</Text>
              )}
              {factionId !== null && (
                <>
                  <Text size="sm" c="dimmed">
                    Militia
                  </Text>
                  <FactionAnchor factionId={factionId}>
                    {profile?.factionName ?? (
                      <FactionName span factionId={factionId} />
                    )}
                  </FactionAnchor>
                </>
              )}
            </Group>
          )}

          <Group gap="xl">
            {corporationSummary && (
              <HeroStat
                label="Pilots"
                value={formatInteger(corporationSummary.pilots)}
              />
            )}
            {corporationCount > 0 && (
              <HeroStat
                label="Corporations"
                value={formatInteger(corporationCount)}
              />
            )}
            {hasSovereignty && (
              <HeroStat
                label="Sov systems"
                value={formatInteger(sovereigntySystems)}
              />
            )}
            {dateFounded && (
              <HeroStat label="Founded" value={formatDate(dateFounded)} />
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
                href={`${link.href}${allianceId}`}
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
            if (isAlliancePageTab(value)) void setActiveTab(value);
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
            <Tabs.Tab
              value="corporations"
              leftSection={<IconBuildingSkyscraper size={16} />}
            >
              Corporations
              {corporationCount > 0 && ` (${formatInteger(corporationCount)})`}
            </Tabs.Tab>
            {hasSovereignty && (
              <Tabs.Tab
                value="sovereignty"
                leftSection={<IconFlag size={16} />}
              >
                Sovereignty ({formatInteger(sovereigntySystems)})
              </Tabs.Tab>
            )}
            {hasWars && warSummary && (
              <Tabs.Tab value="wars" leftSection={<IconSwords size={16} />}>
                Wars ({formatInteger(warSummary.total)})
              </Tabs.Tab>
            )}
            <Tabs.Tab value="killboard" leftSection={<IconSkull size={16} />}>
              Killboard
            </Tabs.Tab>
          </Tabs.List>

          {tablesQuery.isError && TABLE_TABS.has(selectedTab) && (
            <Text c="dimmed" pt="lg">
              Could not load this alliance&apos;s tables. Try again later.
            </Text>
          )}

          {/* Overview */}
          <Tabs.Panel value="overview" pt="lg">
            <Stack gap="lg">
              <Stack gap="sm">
                <SectionHeading icon={<IconInfoCircle size={18} />}>
                  Identity &amp; Leadership
                </SectionHeading>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                  <StatCard label="Alliance ID" value={allianceId} />
                  {ticker && <StatCard label="Ticker" value={`<${ticker}>`} />}
                  {dateFounded && (
                    <StatCard
                      label="Founded"
                      value={formatDate(dateFounded)}
                      sub={
                        now ? `${formatAge(dateFounded, now)} ago` : undefined
                      }
                    />
                  )}
                  <StatCard
                    label="Executor corporation"
                    value={
                      executorCorporationId === null ? (
                        "None — the alliance is closed"
                      ) : (
                        <CorporationLine
                          corporationId={executorCorporationId}
                          name={profile?.executorCorporationName}
                        />
                      )
                    }
                    sub={
                      executorCeo ? (
                        <Group gap={4} wrap="nowrap">
                          CEO
                          <CharacterAnchor
                            characterId={executorCeo.id}
                            size="xs"
                          >
                            {executorCeo.name ?? (
                              <CharacterName
                                span
                                characterId={executorCeo.id}
                              />
                            )}
                          </CharacterAnchor>
                        </Group>
                      ) : undefined
                    }
                  />
                  {creatorId !== undefined && (
                    <StatCard
                      label="Creator"
                      value={
                        <EntityLine
                          avatar={
                            <CharacterAvatar
                              characterId={creatorId}
                              size="sm"
                            />
                          }
                        >
                          <CharacterAnchor characterId={creatorId}>
                            <CharacterName span characterId={creatorId} />
                          </CharacterAnchor>
                        </EntityLine>
                      }
                    />
                  )}
                  {creatorCorporationId !== null && (
                    <StatCard
                      label="Creator corporation"
                      value={
                        <CorporationLine
                          corporationId={creatorCorporationId}
                          name={profile?.creatorCorporationName}
                        />
                      }
                      sub={creatorMembership}
                    />
                  )}
                  <StatCard
                    label="Faction Warfare"
                    value={
                      factionId === null ? (
                        "Not enlisted"
                      ) : (
                        <EntityLine
                          avatar={
                            <FactionAvatar factionId={factionId} size="sm" />
                          }
                        >
                          <FactionAnchor factionId={factionId}>
                            {profile?.factionName ?? (
                              <FactionName span factionId={factionId} />
                            )}
                          </FactionAnchor>
                        </EntityLine>
                      )
                    }
                    sub={
                      corporationSummary && corporationSummary.enlisted > 0
                        ? `${formatInteger(corporationSummary.enlisted)} member corporations enlisted`
                        : undefined
                    }
                  />
                  <StatCard
                    label="Status"
                    value={
                      <Badge variant="light" color={isClosed ? "red" : "teal"}>
                        {isClosed ? "Closed" : "Open"}
                      </Badge>
                    }
                  />
                </SimpleGrid>
              </Stack>

              {corporationSummary && corporationSummary.corporations > 0 && (
                <Stack gap="sm">
                  <SectionHeading icon={<IconUsersGroup size={18} />}>
                    Membership
                  </SectionHeading>
                  <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
                    <StatCard
                      label="Pilots"
                      value={formatInteger(corporationSummary.pilots)}
                    />
                    <StatCard
                      label="Corporations"
                      value={formatInteger(corporationSummary.corporations)}
                    />
                    {corporationSummary.averagePilots !== null && (
                      <StatCard
                        label="Average corporation"
                        value={`${formatDecimal(corporationSummary.averagePilots)} pilots`}
                      />
                    )}
                    {corporationSummary.largest && (
                      <StatCard
                        label="Largest corporation"
                        value={
                          <CorporationLine
                            corporationId={
                              corporationSummary.largest.corporationId
                            }
                            name={corporationSummary.largest.name}
                          />
                        }
                        sub={`${formatInteger(corporationSummary.largest.memberCount ?? 0)} pilots${
                          corporationSummary.largest.share === null
                            ? ""
                            : ` · ${formatPercent(corporationSummary.largest.share)}`
                        }`}
                      />
                    )}
                    {corporationSummary.executorShare !== null && (
                      <StatCard
                        label="Executor's share"
                        value={formatPercent(corporationSummary.executorShare)}
                        sub="of the alliance's pilots"
                      />
                    )}
                    <StatCard
                      label="War eligible"
                      value={`${formatInteger(corporationSummary.warEligible)} of ${formatInteger(corporationSummary.corporations)}`}
                      sub="corporations"
                    />
                    {corporationSummary.pilotWeightedTaxRate !== null && (
                      <StatCard
                        label="Average tax rate"
                        value={formatPercent(
                          corporationSummary.pilotWeightedTaxRate,
                        )}
                        sub="Weighted by pilots"
                      />
                    )}
                    {corporationSummary.oldest?.dateFounded && (
                      <StatCard
                        label="Oldest corporation"
                        value={
                          <CorporationLine
                            corporationId={
                              corporationSummary.oldest.corporationId
                            }
                            name={corporationSummary.oldest.name}
                          />
                        }
                        sub={`Founded ${formatDate(corporationSummary.oldest.dateFounded)}`}
                      />
                    )}
                  </SimpleGrid>
                  <CompositionBar
                    top={composition}
                    pilots={corporationSummary.pilots}
                    corporations={corporationSummary.corporations}
                  />
                </Stack>
              )}

              {hasSovereignty && sovereigntySummary && (
                <Stack gap="sm">
                  <SectionHeading icon={<IconFlag size={18} />}>
                    Sovereignty
                  </SectionHeading>
                  <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                    <StatCard
                      label="Systems"
                      value={formatInteger(sovereigntySummary.systems)}
                    />
                    <StatCard
                      label="Regions"
                      value={formatInteger(sovereigntySummary.regions.length)}
                      sub={sovereigntySummary.regions
                        .slice(0, 3)
                        .map((region) => region.regionName)
                        .filter(Boolean)
                        .join(", ")}
                    />
                    {sovereigntySummary.capital && (
                      <StatCard
                        label="Capital system"
                        value={
                          <SolarSystemAnchor
                            solarSystemId={
                              sovereigntySummary.capital.solarSystemId
                            }
                          >
                            {sovereigntySummary.capital.name}
                          </SolarSystemAnchor>
                        }
                        sub={sovereigntySummary.capital.regionName ?? undefined}
                      />
                    )}
                    {sovereigntySummary.averageAdm !== null && (
                      <StatCard
                        label="Average ADM"
                        value={formatDecimal(sovereigntySummary.averageAdm)}
                      />
                    )}
                  </SimpleGrid>
                </Stack>
              )}

              {hasWars && warSummary && (
                <Stack gap="sm">
                  <SectionHeading icon={<IconSwords size={18} />}>
                    Wars
                  </SectionHeading>
                  <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                    <StatCard
                      label="Wars"
                      value={formatInteger(warSummary.total)}
                    />
                    <StatCard
                      label="Ongoing"
                      value={formatInteger(warSummary.ongoing)}
                    />
                    <StatCard
                      label="Declared"
                      value={formatInteger(warSummary.asAggressor)}
                      sub={`Defended ${formatInteger(warSummary.asDefender)} · allied ${formatInteger(warSummary.asAlly)}`}
                    />
                    <StatCard
                      label="Ships killed / lost"
                      value={`${formatInteger(warSummary.shipsKilled)} / ${formatInteger(warSummary.shipsLost)}`}
                    />
                  </SimpleGrid>
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
                    stats={zkill.data}
                    isLoading={zkill.isLoading}
                  />
                )}
              </Stack>

              {profile && (
                <Text size="xs" c="dimmed">
                  Membership, sovereignty and wars come from our hourly refresh
                  of ESI, read {formatDate(profile.readAt)}{" "}
                  {profile.readAt.slice(11, 16)} EVE time. Killboard figures are
                  from zKillboard.
                </Text>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="corporations" pt="lg">
            <CorporationsTab
              rows={corporationRows}
              isLoading={profile ? tablesLoading : esiMembersLoading}
              hasProfile={profile !== null}
            />
          </Tabs.Panel>

          {hasSovereignty && profile && sovereigntySummary && (
            <Tabs.Panel value="sovereignty" pt="lg">
              <SovereigntyTab
                allianceId={allianceId}
                systems={tables?.sovereignty ?? NO_ROWS}
                isLoading={tablesLoading}
                summary={sovereigntySummary}
                corporationNames={corporationNames}
                readAt={profile.readAt}
              />
            </Tabs.Panel>
          )}

          {hasWars && profile && (
            <Tabs.Panel value="wars" pt="lg">
              <WarsTab
                rows={warRows}
                isLoading={tablesLoading}
                listed={profile.listedWars}
                summary={profile.warSummary}
              />
            </Tabs.Panel>
          )}

          <Tabs.Panel value="killboard" pt="lg">
            <KillboardTab
              allianceId={allianceId}
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
