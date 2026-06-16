"use client";

import { useMemo } from "react";
import {
  Alert,
  Badge,
  Group,
  Loader,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconAlertCircle, IconDatabase } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { DATABASE_STATUS_STALE_MINUTES } from "~/lib/databaseStatus";
import { getDatabaseStatus } from "~/app/status/actions";

const REFETCH_INTERVAL_MS = DATABASE_STATUS_STALE_MINUTES * 60 * 1000;

export function DatabaseDashboard() {
  const { data, error, isLoading } = useQuery({
    // Data comes from a server function (app/status/actions.ts), not a public
    // route — React Query invokes it like any async function. The server
    // function caches for a few minutes, so this polling is cheap.
    queryKey: ["database-status"],
    queryFn: () => getDatabaseStatus(),
    refetchInterval: REFETCH_INTERVAL_MS,
    staleTime: REFETCH_INTERVAL_MS,
  });

  const nonEmptyTables = useMemo(
    () => data?.tables.filter((table) => table.rowCount > 0).length ?? 0,
    [data],
  );

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <Stack gap={0}>
          <Group gap="xs">
            <IconDatabase size={20} />
            <Title order={3}>Database</Title>
          </Group>
          <Text size="xs" c="dimmed">
            Estimated record counts for every table, from CockroachDB table
            statistics · cached for {DATABASE_STATUS_STALE_MINUTES} minutes
          </Text>
        </Stack>
        {data && !data.error && (
          <Badge color="blue" variant="light">
            {data.totals.rows.toLocaleString()} records
          </Badge>
        )}
      </Group>

      {isLoading && (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      )}

      {error && (
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          color="red"
          variant="light"
        >
          Failed to load database status: {error.message}
        </Alert>
      )}

      {data?.error && (
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          color="yellow"
          variant="light"
        >
          Database status is currently unavailable: {data.error}
        </Alert>
      )}

      {data && !data.error && (
        <>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Paper withBorder p="md" shadow="xs">
              <Text size="xs" c="dimmed">
                Tables
              </Text>
              <Text size="xl" fw={700}>
                {data.totals.tables.toLocaleString()}
              </Text>
              <Text size="xs" c="dimmed">
                {nonEmptyTables.toLocaleString()} with records
              </Text>
            </Paper>

            <Paper withBorder p="md" shadow="xs">
              <Text size="xs" c="dimmed">
                Total Records
              </Text>
              <Text size="xl" fw={700}>
                {data.totals.rows.toLocaleString()}
              </Text>
              <Text size="xs" c="dimmed">
                estimated across all tables
              </Text>
            </Paper>

            <Paper withBorder p="md" shadow="xs">
              <Text size="xs" c="dimmed">
                Largest Table
              </Text>
              <Text size="xl" fw={700}>
                {data.tables[0]?.rowCount.toLocaleString() ?? "0"}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {data.tables[0]?.label ?? "-"}
              </Text>
            </Paper>
          </SimpleGrid>

          {data.tables.length === 0 ? (
            <Alert
              icon={<IconAlertCircle size="1rem" />}
              color="gray"
              variant="light"
            >
              No tables were reported by the database.
            </Alert>
          ) : (
            <ScrollArea.Autosize mah={480}>
              <Table
                withTableBorder
                striped
                highlightOnHover
                stickyHeader
                verticalSpacing="xs"
                fz="sm"
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Table</Table.Th>
                    <Table.Th ta="right">Records</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.tables.map((table) => (
                    <Table.Tr key={table.name}>
                      <Table.Td>
                        <Text size="sm" fw={600}>
                          {table.label}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {table.name}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Badge
                          variant="light"
                          color={table.rowCount > 0 ? "blue" : "gray"}
                        >
                          {table.rowCount.toLocaleString()}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>
          )}

          <Text size="xs" c="dimmed">
            Updated {new Date(data.fetchedAt).toLocaleTimeString()} · approximate
            counts from table statistics · refreshes every{" "}
            {DATABASE_STATUS_STALE_MINUTES} minutes
          </Text>
        </>
      )}
    </Stack>
  );
}
