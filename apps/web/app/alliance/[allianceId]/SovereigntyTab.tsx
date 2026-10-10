"use client";

import { useMemo } from "react";
import {
  Badge,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { useGetSovereigntyCampaigns } from "@jitaspace/esi-client";
import {
  AllianceName,
  ConstellationAnchor,
  RegionAnchor,
  SolarSystemAnchor,
  SolarSystemName,
} from "@jitaspace/eve-components";
import {
  CategoryOngoingConflictsIcon,
  CategorySolarSystemIcon,
  CategorySovereigntyIcon,
  ControlRegionLayoutIcon,
} from "@jitaspace/eve-icons";
import {
  AllianceAnchor,
  CorporationAnchor,
  SolarSystemSecurityStatusBadge,
} from "@jitaspace/ui";

import type { SovereigntySummary } from "./sovereignty";
import type { AllianceSovereigntySystem } from "./types";
import { DataTable } from "~/components/DataTable";
import { SectionHeading, StatCard } from "~/components/EntityPage";
import {
  formatAge,
  formatDate,
  formatDateTime,
  formatDecimal,
  formatInteger,
  formatUtcTime,
} from "~/lib/format";

const CAMPAIGN_EVENT_LABELS: Record<string, string> = {
  tcu_defense: "TCU defense",
  ihub_defense: "Sovereignty hub defense",
  station_defense: "Station defense",
  station_freeport: "Station freeport",
};

function indexLevel(level: number | null) {
  return level === null ? null : formatInteger(level);
}

function buildColumns(
  corporationNames: ReadonlyMap<number, string>,
): DataTableColumn<AllianceSovereigntySystem>[] {
  return [
    {
      id: "system",
      header: "System",
      accessor: "name",
      sortable: true,
      enableHiding: false,
      cell: (system) => (
        <Group gap="xs" wrap="nowrap">
          <SolarSystemAnchor
            solarSystemId={system.solarSystemId}
            prefetch={false}
          >
            {system.name}
          </SolarSystemAnchor>
          {system.isCapitalSystem && (
            <Badge size="xs" variant="light" color="yellow">
              Capital
            </Badge>
          )}
        </Group>
      ),
    },
    {
      id: "security",
      header: "Security",
      accessor: "securityStatus",
      sortable: true,
      align: "right",
      cell: (system) => (
        <SolarSystemSecurityStatusBadge
          securityStatus={system.securityStatus}
          size="sm"
        />
      ),
    },
    {
      id: "constellation",
      header: "Constellation",
      accessor: "constellationName",
      sortable: true,
      filter: { type: "select" },
      cell: (system) => (
        <ConstellationAnchor
          constellationId={system.constellationId}
          prefetch={false}
        >
          {system.constellationName}
        </ConstellationAnchor>
      ),
    },
    {
      id: "region",
      header: "Region",
      accessor: "regionName",
      sortable: true,
      filter: { type: "select" },
      cell: (system) =>
        system.regionId === null ? null : (
          <RegionAnchor regionId={system.regionId} prefetch={false}>
            {system.regionName ?? system.regionId}
          </RegionAnchor>
        ),
    },
    {
      id: "adm",
      header: "ADM",
      accessor: "activityDefenseMultiplier",
      sortable: true,
      align: "right",
      filter: { type: "range", min: 0 },
      cell: (system) =>
        system.activityDefenseMultiplier === null
          ? null
          : formatDecimal(system.activityDefenseMultiplier),
    },
    {
      id: "military",
      header: "Military",
      accessor: "militaryLevel",
      sortable: true,
      align: "right",
      cell: (system) => indexLevel(system.militaryLevel),
    },
    {
      id: "industrial",
      header: "Industrial",
      accessor: "industrialLevel",
      sortable: true,
      align: "right",
      cell: (system) => indexLevel(system.industrialLevel),
    },
    {
      id: "strategic",
      header: "Strategic",
      accessor: "strategicLevel",
      sortable: true,
      align: "right",
      cell: (system) => indexLevel(system.strategicLevel),
    },
    {
      id: "vulnerability",
      header: "Vulnerable (EVE time)",
      accessor: "vulnerabilityWindowStart",
      sortable: true,
      cell: (system) => {
        if (system.vulnerabilityWindowStart === null) {
          return system.sovereigntyHubId === null ? null : (
            <Badge size="sm" variant="light" color="red">
              In campaign
            </Badge>
          );
        }
        const end = system.vulnerabilityWindowEnd;
        return `${formatDateTime(system.vulnerabilityWindowStart)}${
          end ? `–${formatUtcTime(end)}` : ""
        }`;
      },
    },
    {
      id: "claimedSince",
      header: "Claimed since",
      accessor: "claimedSince",
      sortable: true,
      filter: { type: "date-range" },
      cell: (system) =>
        system.claimedSince ? formatDate(system.claimedSince) : null,
    },
    {
      id: "holder",
      header: "Holding corporation",
      accessor: (system) =>
        system.corporationId === null
          ? null
          : (corporationNames.get(system.corporationId) ?? null),
      sortable: true,
      defaultVisible: false,
      cell: (system) =>
        system.corporationId === null ? null : (
          <CorporationAnchor
            corporationId={system.corporationId}
            prefetch={false}
          >
            {corporationNames.get(system.corporationId) ?? system.corporationId}
          </CorporationAnchor>
        ),
    },
    {
      id: "hub",
      header: "Sovereignty hub ID",
      accessor: "sovereigntyHubId",
      defaultVisible: false,
    },
  ];
}

function Campaigns({
  allianceId,
  systemNames,
}: Readonly<{
  allianceId: number;
  systemNames: ReadonlyMap<number, string>;
}>) {
  const { data } = useGetSovereigntyCampaigns();
  const campaigns = useMemo(
    () =>
      (data?.data ?? [])
        .filter(
          (campaign) =>
            campaign.defender_id === allianceId ||
            campaign.participants?.some(
              (participant) => participant.alliance_id === allianceId,
            ),
        )
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [allianceId, data?.data],
  );
  if (campaigns.length === 0) return null;

  return (
    <Stack gap="sm">
      <SectionHeading
        icon={
          <CategoryOngoingConflictsIcon size={18} color="currentColor" alt="" />
        }
      >
        Active campaigns
      </SectionHeading>
      <Paper withBorder radius="md" p="sm">
        <Table highlightOnHover verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Event</Table.Th>
              <Table.Th>System</Table.Th>
              <Table.Th>Starts (EVE time)</Table.Th>
              <Table.Th>Defender / attackers</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {campaigns.map((campaign) => {
              const defender = campaign.defender_score;
              const attackers = campaign.attackers_score;
              return (
                <Table.Tr key={campaign.campaign_id}>
                  <Table.Td>
                    {CAMPAIGN_EVENT_LABELS[campaign.event_type] ??
                      campaign.event_type}
                  </Table.Td>
                  <Table.Td>
                    <SolarSystemAnchor solarSystemId={campaign.solar_system_id}>
                      {systemNames.get(campaign.solar_system_id) ?? (
                        <SolarSystemName
                          span
                          solarSystemId={campaign.solar_system_id}
                        />
                      )}
                    </SolarSystemAnchor>
                  </Table.Td>
                  <Table.Td>{formatDateTime(campaign.start_time)}</Table.Td>
                  <Table.Td miw={180}>
                    {defender !== undefined && attackers !== undefined ? (
                      <Stack gap={2}>
                        <Progress.Root size="md">
                          <Progress.Section
                            value={defender * 100}
                            color="teal"
                          />
                          <Progress.Section
                            value={attackers * 100}
                            color="red"
                          />
                        </Progress.Root>
                        <Text size="xs" c="dimmed">
                          {Math.round(defender * 100)}% /{" "}
                          {Math.round(attackers * 100)}%
                        </Text>
                      </Stack>
                    ) : (
                      <Group gap={4}>
                        {campaign.participants?.map((participant) => (
                          <AllianceAnchor
                            key={participant.alliance_id}
                            allianceId={participant.alliance_id}
                            size="xs"
                          >
                            <AllianceName
                              span
                              allianceId={participant.alliance_id}
                            />{" "}
                            ({Math.round(participant.score * 100)}%)
                          </AllianceAnchor>
                        ))}
                      </Group>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}

export function SovereigntyTab({
  allianceId,
  systems,
  isLoading,
  summary,
  corporationNames,
  readAt,
}: Readonly<{
  allianceId: number;
  systems: AllianceSovereigntySystem[];
  /** The rows are still on their way from `/api/alliance/[allianceId]`. */
  isLoading: boolean;
  summary: SovereigntySummary;
  corporationNames: ReadonlyMap<number, string>;
  readAt: string;
}>) {
  const columns = useMemo(
    () => buildColumns(corporationNames),
    [corporationNames],
  );
  const systemNames = useMemo(
    () => new Map(systems.map((system) => [system.solarSystemId, system.name])),
    [systems],
  );

  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <SectionHeading
          icon={
            <CategorySovereigntyIcon size={18} color="currentColor" alt="" />
          }
        >
          Holdings
        </SectionHeading>
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
          <StatCard label="Systems" value={formatInteger(summary.systems)} />
          <StatCard
            label="Constellations"
            value={formatInteger(summary.constellations)}
          />
          <StatCard
            label="Regions"
            value={formatInteger(summary.regions.length)}
          />
          <StatCard
            label="Sovereignty hubs"
            value={formatInteger(summary.hubs)}
          />
          {summary.capital && (
            <StatCard
              label="Capital system"
              value={
                <SolarSystemAnchor
                  solarSystemId={summary.capital.solarSystemId}
                >
                  {summary.capital.name}
                </SolarSystemAnchor>
              }
              sub={summary.capital.regionName ?? undefined}
            />
          )}
          {summary.averageAdm !== null && (
            <StatCard
              label="Average ADM"
              value={formatDecimal(summary.averageAdm)}
              sub={
                summary.maxAdm === null
                  ? undefined
                  : `Highest ${formatDecimal(summary.maxAdm)}`
              }
            />
          )}
          {summary.oldestClaim?.claimedSince && (
            <StatCard
              label="Longest-held claim"
              value={
                <SolarSystemAnchor
                  solarSystemId={summary.oldestClaim.solarSystemId}
                >
                  {summary.oldestClaim.name}
                </SolarSystemAnchor>
              }
              sub={`Since ${formatDate(summary.oldestClaim.claimedSince)} (${formatAge(
                summary.oldestClaim.claimedSince,
                readAt,
              )})`}
            />
          )}
        </SimpleGrid>
      </Stack>

      <Campaigns allianceId={allianceId} systemNames={systemNames} />

      <Stack gap="sm">
        <SectionHeading
          icon={
            <ControlRegionLayoutIcon size={18} color="currentColor" alt="" />
          }
        >
          By region
        </SectionHeading>
        <Paper withBorder radius="md" p="sm">
          <Table highlightOnHover verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Region</Table.Th>
                <Table.Th ta="right">Constellations</Table.Th>
                <Table.Th ta="right">Systems</Table.Th>
                <Table.Th w="40%">Share</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {summary.regions.map((region) => (
                <Table.Tr key={region.regionId ?? "unknown"}>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      {region.regionId === null ? (
                        <Text size="sm">Unknown</Text>
                      ) : (
                        <RegionAnchor regionId={region.regionId}>
                          {region.regionName ?? region.regionId}
                        </RegionAnchor>
                      )}
                      {region.hasCapital && (
                        <Badge size="xs" variant="light" color="yellow">
                          Capital
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td ta="right">
                    {formatInteger(region.constellations)}
                  </Table.Td>
                  <Table.Td ta="right">
                    {formatInteger(region.systems)}
                  </Table.Td>
                  <Table.Td>
                    <Progress
                      value={(region.systems / summary.systems) * 100}
                      size="sm"
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>

      <Stack gap="sm">
        <SectionHeading
          icon={
            <CategorySolarSystemIcon size={18} color="currentColor" alt="" />
          }
        >
          Systems
        </SectionHeading>
        <DataTable
          data={systems}
          columns={columns}
          rowId={(system) => system.solarSystemId}
          isLoading={isLoading}
          initialSort={{ columnId: "system", direction: "asc" }}
          withGlobalFilter
          withColumnVisibility
          withPagination
          defaultPageSize={50}
          verticalSpacing="xs"
          highlightOnHover
          striped
        />
        <Text size="xs" c="dimmed">
          Activity Defense Multiplier (ADM) and the military, industrial and
          strategic index levels are as of our last hourly refresh from ESI.
          Campaigns are live.
        </Text>
      </Stack>
    </Stack>
  );
}
