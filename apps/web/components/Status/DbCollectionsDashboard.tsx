"use client";

import { useMemo, useState } from "react";
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
  collection: typeof db.esiNamesCollection;
}

interface CollectionStatsProps {
  collection: CollectionDefinition;
  onOpenCollection: (collection: CollectionDefinition) => void;
}

const collections: CollectionDefinition[] = [
  { name: "ESI Names", collection: db.esiNamesCollection },
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
}: Readonly<CollectionStatsProps>) {
  const { data } = useLiveQuery(collection.collection);
  const items = Array.isArray(data) ? data : [];
  const count = items.length;

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
}: Readonly<CollectionBrowserModalProps>) {
  const { data } = useLiveQuery(collection.collection);
  const items = Array.isArray(data) ? data : [];
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(
    DEFAULT_COLLECTION_BROWSER_PAGE_SIZE.toString(),
  );

  const pageSizeNumber = Number(pageSize);
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSizeNumber));

  // Reset to the first page whenever the collection or page size changes, and
  // clamp the current page if it ends up past the last page. Adjusting state
  // during render (rather than in an effect) avoids an extra render pass and
  // the cascading-render warning. https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const resetKey = `${collection.name}:${pageSizeNumber}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (lastResetKey !== resetKey) {
    setLastResetKey(resetKey);
    setPage(1);
  } else if (page > totalPages) {
    setPage(totalPages);
  }

  const visibleItems = useMemo(() => {
    const start = (page - 1) * pageSizeNumber;
    return items.slice(start, start + pageSizeNumber);
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
