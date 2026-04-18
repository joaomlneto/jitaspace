"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Code,
  Group,
  Modal,
  Pagination,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useLiveQuery } from "@tanstack/react-db";

import * as db from "@jitaspace/hooks";

const COLLECTION_BROWSER_PAGE_SIZES = [25, 50, 100, 250] as const;
const DEFAULT_COLLECTION_BROWSER_PAGE_SIZE = 50;

interface CollectionDefinition {
  name: string;
  collection: any;
}

interface CollectionStatsProps {
  collection: CollectionDefinition;
  onOpenCollection: (collection: CollectionDefinition) => void;
}

const collections: CollectionDefinition[] = [
  { name: "Characters", collection: db.charactersCollection },
  { name: "Market Groups", collection: db.marketGroupsCollection },
  { name: "Categories", collection: db.categoriesCollection },
  { name: "Groups", collection: db.groupsCollection },
  { name: "Types", collection: db.typesCollection },
  { name: "Dogma Attributes", collection: db.dogmaAttributesCollection },
  { name: "Dogma Effects", collection: db.dogmaEffectsCollection },
  { name: "Dogma Units", collection: db.dogmaUnitsCollection },
  { name: "Alliances", collection: db.alliancesCollection },
  { name: "Corporations", collection: db.corporationsCollection },
  { name: "Factions", collection: db.factionsCollection },
  { name: "Stations", collection: db.stationsCollection },
  { name: "Races", collection: db.racesCollection },
  { name: "Regions", collection: db.regionsCollection },
  { name: "Constellations", collection: db.constellationsCollection },
  { name: "Solar Systems", collection: db.solarSystemsCollection },
  { name: "Stars", collection: db.starsCollection },
  { name: "Stargates", collection: db.stargatesCollection },
  { name: "Planets", collection: db.planetsCollection },
  { name: "Moons", collection: db.moonsCollection },
  { name: "Asteroid Belts", collection: db.asteroidBeltsCollection },
  { name: "Ancestries", collection: db.ancestriesCollection },
  { name: "Bloodlines", collection: db.bloodlinesCollection },
  {
    name: "Loyalty Store Offers",
    collection: db.loyaltyStoreOffersCollection,
  },
  { name: "Killmails", collection: db.killmailsCollection },
  { name: "Agents", collection: db.agentsCollection },
];

interface CollectionBrowserModalProps {
  opened: boolean;
  collection: CollectionDefinition;
  onClose: () => void;
}

function getCollectionItemKey(item: unknown, absoluteIndex: number): string {
  if (typeof item === "object" && item !== null) {
    const record = item as Record<string, unknown>;
    const directId = record.id;
    if (typeof directId === "string" || typeof directId === "number") {
      return String(directId);
    }

    for (const [key, value] of Object.entries(record)) {
      if (
        key.endsWith("_id") &&
        (typeof value === "string" || typeof value === "number")
      ) {
        return `${key}:${value}`;
      }
    }
  }

  return `row-${absoluteIndex}`;
}

function getCollectionItemPreview(item: unknown): string {
  if (typeof item === "string") {
    return item;
  }

  try {
    const serialized = JSON.stringify(item);
    if (!serialized) return String(item);
    return serialized.length > 220
      ? `${serialized.slice(0, 220)}…`
      : serialized;
  } catch {
    return String(item);
  }
}

function CollectionStats({
  collection,
  onOpenCollection,
}: CollectionStatsProps) {
  const { data: items } = useLiveQuery(collection.collection);
  const count = items?.length ?? 0;

  return (
    <Table.Tr>
      <Table.Td>
        <Button
          variant="subtle"
          size="compact-sm"
          px={0}
          onClick={() => onOpenCollection(collection)}
        >
          {collection.name}
        </Button>
      </Table.Td>
      <Table.Td align="right">
        <Badge variant="light" color={count > 0 ? "blue" : "gray"}>
          {count.toLocaleString()}
        </Badge>
      </Table.Td>
    </Table.Tr>
  );
}

function CollectionBrowserModal({
  opened,
  collection,
  onClose,
}: CollectionBrowserModalProps) {
  const { data: items } = useLiveQuery(collection.collection);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(
    DEFAULT_COLLECTION_BROWSER_PAGE_SIZE.toString(),
  );

  const pageSizeNumber = Number(pageSize);
  const totalCount = items?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSizeNumber));

  useEffect(() => {
    setPage(1);
  }, [collection.name]);

  useEffect(() => {
    setPage(1);
  }, [pageSizeNumber]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const visibleItems = useMemo(() => {
    const start = (page - 1) * pageSizeNumber;
    return items?.slice(start, start + pageSizeNumber) ?? [];
  }, [items, page, pageSizeNumber]);

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSizeNumber + 1;
  const rangeEnd = Math.min(page * pageSizeNumber, totalCount);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      title={`${collection.name} Collection Browser`}
      centered
    >
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              Entries
            </Text>
            <Badge variant="light">{totalCount.toLocaleString()}</Badge>
          </Group>

          <Select
            label="Rows per page"
            size="xs"
            w={140}
            value={pageSize}
            onChange={(value) =>
              setPageSize(
                value ?? DEFAULT_COLLECTION_BROWSER_PAGE_SIZE.toString(),
              )
            }
            data={COLLECTION_BROWSER_PAGE_SIZES.map((size) => ({
              label: `${size}`,
              value: `${size}`,
            }))}
          />
        </Group>

        <Text size="xs" c="dimmed">
          {totalCount === 0
            ? "No entries are currently loaded for this collection."
            : `Showing ${rangeStart}-${rangeEnd} of ${totalCount.toLocaleString()} entries`}
        </Text>

        <ScrollArea h={420}>
          <Table verticalSpacing="xs" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={72}>#</Table.Th>
                <Table.Th w={220}>Key</Table.Th>
                <Table.Th>Preview</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {visibleItems.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={3}>
                    <Text size="sm" c="dimmed">
                      No records on this page.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                visibleItems.map((item, index) => {
                  const absoluteIndex = (page - 1) * pageSizeNumber + index;
                  const itemKey = getCollectionItemKey(item, absoluteIndex);

                  return (
                    <Table.Tr key={`${itemKey}-${absoluteIndex}`}>
                      <Table.Td>{absoluteIndex + 1}</Table.Td>
                      <Table.Td>
                        <Code>{itemKey}</Code>
                      </Table.Td>
                      <Table.Td>
                        <Code>{getCollectionItemPreview(item)}</Code>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        <Pagination
          withEdges
          value={page}
          onChange={setPage}
          total={totalPages}
          size="sm"
        />
      </Stack>
    </Modal>
  );
}

export function DbCollectionsDashboard() {
  const [selectedCollection, setSelectedCollection] =
    useState<CollectionDefinition | null>(null);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);

  const openCollectionBrowser = (collection: CollectionDefinition) => {
    setSelectedCollection(collection);
    setIsBrowserOpen(true);
  };

  const closeCollectionBrowser = () => {
    setIsBrowserOpen(false);
  };

  // Split collections into two columns for the dashboard
  const midpoint = Math.ceil(collections.length / 2);
  const leftColumn = collections.slice(0, midpoint);
  const rightColumn = collections.slice(midpoint);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Title order={3}>Client-side Database Stores</Title>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Paper withBorder p="md" shadow="xs">
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Collection</Table.Th>
                <Table.Th align="right">Entries</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {leftColumn.map((col) => (
                <CollectionStats
                  key={col.name}
                  collection={col}
                  onOpenCollection={openCollectionBrowser}
                />
              ))}
            </Table.Tbody>
          </Table>
        </Paper>

        <Paper withBorder p="md" shadow="xs">
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Collection</Table.Th>
                <Table.Th align="right">Entries</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rightColumn.map((col) => (
                <CollectionStats
                  key={col.name}
                  collection={col}
                  onOpenCollection={openCollectionBrowser}
                />
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      </SimpleGrid>

      {selectedCollection ? (
        <CollectionBrowserModal
          opened={isBrowserOpen}
          collection={selectedCollection}
          onClose={closeCollectionBrowser}
        />
      ) : null}
    </Stack>
  );
}
