"use client";

import {
  Alert,
  Badge,
  Group,
  Loader,
  ScrollArea,
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
