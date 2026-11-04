"use client";

import { memo } from "react";
import {
  Badge,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";

import type { ColonyLayout } from "@jitaspace/hooks";

import type { PiCatalog } from "./catalog";
import type { ColonyRow } from "./colonies";
import { PlanetName } from "~/components/Text";
import { PIN_KIND_LABELS, PIN_KINDS } from "./catalog";
import {
  CharacterCell,
  DimmedText,
  formatEveTime,
  formatInteger,
  formatNumber,
  planetTypeLabel,
  SolarSystemCell,
  StatusBadge,
  TypeCell,
} from "./cells";
import { formatRelative } from "./colonies";
import { ColonyMap } from "./ColonyMap";

export interface ColonyDetailsProps {
  row: ColonyRow;
  layout: ColonyLayout;
  catalog: PiCatalog;
  now: number | null;
}

/** Everything about one colony: its map, extractors, factories and stock. */
export const ColonyDetails = memo(
  ({ row, layout, catalog, now }: ColonyDetailsProps) => {
    const summary = row.summary;
    if (!summary) return null;
    return (
      <Stack>
        <Group gap="lg">
          <CharacterCell characterId={row.subjectId} />
          <SolarSystemCell solarSystemId={row.solar_system_id} />
          <Badge variant="light">{planetTypeLabel(row.planet_type)}</Badge>
          <Text size="sm">Upgrade level {row.upgrade_level}</Text>
          <StatusBadge status={summary.status} />
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <ColonyMap
            layout={layout}
            catalog={catalog}
            label={`Map of the colony on ${planetTypeLabel(row.planet_type)} planet, with ${layout.pins.length} structures and ${layout.links.length} links`}
          />
          <Table
            withRowBorders={false}
            verticalSpacing={4}
            aria-label="Structures by kind"
          >
            <Table.Tbody>
              {PIN_KINDS.filter((kind) => summary.pinCounts[kind] > 0).map(
                (kind) => (
                  <Table.Tr key={kind}>
                    <Table.Th scope="row">{PIN_KIND_LABELS[kind]}</Table.Th>
                    <Table.Td ta="right">{summary.pinCounts[kind]}</Table.Td>
                  </Table.Tr>
                ),
              )}
              <Table.Tr>
                <Table.Th scope="row">Routes</Table.Th>
                <Table.Td ta="right">{layout.routes.length}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </SimpleGrid>

        <Title order={3} size="h4">
          Extractors
        </Title>
        {summary.extractors.length === 0 ? (
          <DimmedText>This colony has no extractors.</DimmedText>
        ) : (
          <Table.ScrollContainer minWidth={520}>
            <Table striped aria-label="Extractors">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Product</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Program ends</Table.Th>
                  <Table.Th ta="right">Units / hour</Table.Th>
                  <Table.Th ta="right">Heads</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {summary.extractors.map((extractor) => (
                  <Table.Tr key={extractor.pinId}>
                    <Table.Td>
                      {extractor.productTypeId === undefined ? (
                        <DimmedText>No program</DimmedText>
                      ) : (
                        <TypeCell
                          typeId={extractor.productTypeId}
                          catalog={catalog}
                        />
                      )}
                    </Table.Td>
                    <Table.Td>
                      <StatusBadge status={extractor.status} />
                    </Table.Td>
                    <Table.Td>
                      {extractor.expiryTime === undefined || now === null
                        ? "—"
                        : `${formatRelative(extractor.expiryTime, now)} (${formatEveTime(extractor.expiryTime)})`}
                    </Table.Td>
                    <Table.Td ta="right">
                      {formatNumber(extractor.perHour)}
                    </Table.Td>
                    <Table.Td ta="right">{extractor.headCount}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}

        <Title order={3} size="h4">
          Factories
        </Title>
        {summary.factories.length === 0 ? (
          <DimmedText>This colony has no factories.</DimmedText>
        ) : (
          <Table.ScrollContainer minWidth={420}>
            <Table striped aria-label="Factories">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Schematic</Table.Th>
                  <Table.Th>Output</Table.Th>
                  <Table.Th ta="right">Units / hour</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {summary.factories.map((factory) => (
                  <Table.Tr key={factory.pinId}>
                    <Table.Td>
                      {factory.schematic?.name ??
                        (factory.schematicId === undefined
                          ? "Not set"
                          : `Schematic ${factory.schematicId}`)}
                    </Table.Td>
                    <Table.Td>
                      {factory.schematic?.output ? (
                        <TypeCell
                          typeId={factory.schematic.output.typeId}
                          catalog={catalog}
                          withTier
                        />
                      ) : (
                        "—"
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      {formatNumber(factory.outputPerHour)}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}

        <Title order={3} size="h4">
          In storage
        </Title>
        {summary.storage.length === 0 ? (
          <DimmedText>Nothing is stored on this colony.</DimmedText>
        ) : (
          <Table striped aria-label="Stored commodities">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Commodity</Table.Th>
                <Table.Th ta="right">Amount</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {summary.storage.map((item) => (
                <Table.Tr key={item.typeId}>
                  <Table.Td>
                    <TypeCell typeId={item.typeId} catalog={catalog} withTier />
                  </Table.Td>
                  <Table.Td ta="right">{formatInteger(item.amount)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    );
  },
);
ColonyDetails.displayName = "ColonyDetails";

/** The colony's planet, for a heading. */
export function ColonyTitle({ row }: Readonly<{ row: ColonyRow }>) {
  return <PlanetName span inherit planetId={row.planet_id} />;
}
