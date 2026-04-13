"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  ColorSwatch,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

import type { MetaStatusRoutestatus } from "@jitaspace/esi-client";
import { useGetMetaStatus } from "@jitaspace/esi-client";

const statusToColor: Record<string, string> = {
  OK: "green",
  Degraded: "yellow",
  Down: "red",
  Recovering: "orange",
  Unknown: "gray",
};

export interface EsiStatusDashboardProps {
  initialShowAll?: boolean;
}

export function EsiStatusDashboard({
  initialShowAll = false,
}: EsiStatusDashboardProps) {
  const [showAllEsiEndpoints, setShowAllEsiEndpoints] =
    useState(initialShowAll);

  const { data: esiStatus } = useGetMetaStatus(
    { "X-Compatibility-Date": "2025-12-16" },
    { query: { refetchInterval: 30 * 1000 } },
  );

  // Group routes by first path segment
  const esiStatusByGroup = useMemo(() => {
    const result: Record<string, MetaStatusRoutestatus[]> = {};
    const routes = esiStatus?.data.routes ?? [];

    routes
      .filter((entry) => showAllEsiEndpoints || entry.status !== "OK")
      .forEach((entry) => {
        const group = entry.path.split("/")[1] || "Other";
        result[group] = [...(result[group] ?? []), entry];
      });
    return result;
  }, [esiStatus, showAllEsiEndpoints]);

  const sortedGroups = useMemo(
    () => Object.keys(esiStatusByGroup).sort((a, b) => a.localeCompare(b)),
    [esiStatusByGroup],
  );

  if (!esiStatus && !sortedGroups.length) {
    return null;
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Title order={3}>ESI Endpoints Status</Title>
        <Switch
          label="Show all endpoints"
          description="Toggle between showing all ESI endpoints or only those that are degraded"
          checked={showAllEsiEndpoints}
          onChange={(event) =>
            setShowAllEsiEndpoints(event.currentTarget.checked)
          }
        />
      </Group>

      {sortedGroups.length === 0 ? (
        <Alert icon={<IconAlertCircle size="1rem" />} color="green">
          All ESI endpoints are currently operational.
        </Alert>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
          {sortedGroups.map((group) => (
            <Paper key={group} withBorder p="md" shadow="xs">
              <Stack gap="xs">
                <Title order={6} style={{ textTransform: "capitalize" }}>
                  {group}
                </Title>
                <Table verticalSpacing={4} horizontalSpacing={4} fz="xs">
                  <Table.Tbody>
                    {esiStatusByGroup[group]?.map((entry) => (
                      <Table.Tr key={`${entry.method}-${entry.path}`}>
                        <Table.Td width={1} style={{ whiteSpace: "nowrap" }}>
                          <Text size="xs" fw={700}>
                            {entry.method.toUpperCase()}
                          </Text>
                        </Table.Td>
                        <Table.Td
                          style={{
                            maxWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={entry.path}
                        >
                          {entry.path}
                        </Table.Td>
                        <Table.Td align="right" width={1}>
                          <ColorSwatch
                            color={statusToColor[entry.status] ?? "gray"}
                            size={12}
                          />
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}
