"use client";

import type { ReactNode } from "react";
import { Group, Paper, SimpleGrid, Stack, Table, Text } from "@mantine/core";
import {
  IconArrowsExchange,
  IconBuildingBank,
  IconChartPie,
  IconPackage,
  IconSitemap,
} from "@tabler/icons-react";

import type { DataTableColumn } from "@jitaspace/datatable";
import {
  CharacterAnchor,
  CharacterName,
  TypeAnchor,
  TypeAvatar,
} from "@jitaspace/eve-components";
import { CorporationAnchor, CorporationAvatar } from "@jitaspace/ui";

import type {
  CorporationTrade,
  ExchangeRate,
  NpcCorporationDetails,
  Shareholding,
} from "./types";
import { DataTable } from "~/components/DataTable";
import { SectionHeading } from "~/components/EntityPage";
import { formatDecimal, formatInteger } from "~/lib/format";

function CorporationCell({
  corporationId,
  name,
}: Readonly<{ corporationId: number; name: string }>) {
  return (
    <Group gap="xs" wrap="nowrap">
      <CorporationAvatar corporationId={corporationId} size="sm" />
      <CorporationAnchor corporationId={corporationId} prefetch={false}>
        {name}
      </CorporationAnchor>
    </Group>
  );
}

function SimpleTable({
  head,
  children,
}: Readonly<{ head: ReactNode; children: ReactNode }>) {
  return (
    <Paper withBorder radius="md" p="sm">
      <Table highlightOnHover verticalSpacing="xs">
        <Table.Thead>{head}</Table.Thead>
        <Table.Tbody>{children}</Table.Tbody>
      </Table>
    </Paper>
  );
}

function Shareholdings({ holdings }: Readonly<{ holdings: Shareholding[] }>) {
  const total = holdings.reduce((sum, holding) => sum + holding.shares, 0);
  return (
    <SimpleTable
      head={
        <Table.Tr>
          <Table.Th>Corporation</Table.Th>
          <Table.Th ta="right">Shares</Table.Th>
          <Table.Th ta="right">Share</Table.Th>
        </Table.Tr>
      }
    >
      {holdings.map((holding) => (
        <Table.Tr key={holding.corporationId}>
          <Table.Td>
            <CorporationCell
              corporationId={holding.corporationId}
              name={holding.name}
            />
          </Table.Td>
          <Table.Td ta="right">{formatInteger(holding.shares)}</Table.Td>
          <Table.Td ta="right">
            {total > 0
              ? `${formatDecimal((holding.shares / total) * 100)}%`
              : null}
          </Table.Td>
        </Table.Tr>
      ))}
    </SimpleTable>
  );
}

function ExchangeRates({ rates }: Readonly<{ rates: ExchangeRate[] }>) {
  return (
    <SimpleTable
      head={
        <Table.Tr>
          <Table.Th>Corporation</Table.Th>
          <Table.Th ta="right">Rate</Table.Th>
        </Table.Tr>
      }
    >
      {rates.map((rate) => (
        <Table.Tr key={rate.corporationId}>
          <Table.Td>
            <CorporationCell
              corporationId={rate.corporationId}
              name={rate.name}
            />
          </Table.Td>
          <Table.Td ta="right" ff="monospace">
            {rate.rate.toFixed(2)}
          </Table.Td>
        </Table.Tr>
      ))}
    </SimpleTable>
  );
}

const tradeColumns: DataTableColumn<CorporationTrade>[] = [
  {
    id: "type",
    header: "Item",
    accessor: "typeName",
    sortable: true,
    enableHiding: false,
    cell: (trade) => (
      <Group gap="xs" wrap="nowrap">
        <TypeAvatar typeId={trade.typeId} size="sm" />
        <TypeAnchor typeId={trade.typeId} prefetch={false}>
          {trade.typeName}
        </TypeAnchor>
      </Group>
    ),
  },
  {
    id: "value",
    header: "Value",
    accessor: "value",
    sortable: true,
    align: "right",
    cell: (trade) => formatDecimal(trade.value),
  },
];

/**
 * The SDE's economic model of an NPC corporation: its divisions, who holds
 * its shares and whose it holds, its exchange rates with other corporations,
 * and the goods it trades.
 */
export function EconomyTab({
  npc,
  trades,
  tradesLoading,
}: Readonly<{
  npc: NpcCorporationDetails;
  trades: CorporationTrade[];
  tradesLoading: boolean;
}>) {
  return (
    <Stack gap="lg">
      {npc.divisions.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconSitemap size={18} />}>
            Divisions
          </SectionHeading>
          <SimpleTable
            head={
              <Table.Tr>
                <Table.Th>Division</Table.Th>
                <Table.Th ta="right">Size</Table.Th>
                <Table.Th>Leader</Table.Th>
              </Table.Tr>
            }
          >
            {npc.divisions.map((division) => (
              <Table.Tr key={division.divisionId}>
                <Table.Td>{division.name}</Table.Td>
                <Table.Td ta="right">{division.size ?? "—"}</Table.Td>
                <Table.Td>
                  {division.leaderId === null ? null : (
                    <CharacterAnchor characterId={division.leaderId}>
                      <CharacterName span characterId={division.leaderId} />
                    </CharacterAnchor>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </SimpleTable>
        </Stack>
      )}

      {(npc.investors.length > 0 || npc.investedIn.length > 0) && (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {npc.investors.length > 0 && (
            <Stack gap="sm">
              <SectionHeading icon={<IconChartPie size={18} />}>
                Shareholders
              </SectionHeading>
              <Shareholdings holdings={npc.investors} />
            </Stack>
          )}
          {npc.investedIn.length > 0 && (
            <Stack gap="sm">
              <SectionHeading icon={<IconBuildingBank size={18} />}>
                Holds shares in
              </SectionHeading>
              <Shareholdings holdings={npc.investedIn} />
            </Stack>
          )}
        </SimpleGrid>
      )}

      {npc.exchangeRates.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconArrowsExchange size={18} />}>
            Exchange rates
          </SectionHeading>
          <ExchangeRates rates={npc.exchangeRates} />
        </Stack>
      )}

      {(tradesLoading || trades.length > 0) && (
        <Stack gap="sm">
          <SectionHeading icon={<IconPackage size={18} />}>
            Trade goods
          </SectionHeading>
          <DataTable
            data={trades}
            columns={tradeColumns}
            rowId={(trade) => trade.typeId}
            isLoading={tradesLoading}
            initialSort={{ columnId: "type", direction: "asc" }}
            withGlobalFilter
            withPagination
            defaultPageSize={25}
            verticalSpacing="xs"
            highlightOnHover
            striped
          />
          <Text size="xs" c="dimmed">
            The items this corporation trades in, with the value the static data
            gives each, as CCP ships it.
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
