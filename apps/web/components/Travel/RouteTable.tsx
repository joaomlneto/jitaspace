import React, { memo, useMemo } from "react";
import { Anchor, Group, Table, Text, Tooltip } from "@mantine/core";

import { InfoIcon } from "@jitaspace/eve-icons";
import { useAllSolarSystemKills } from "@jitaspace/hooks";
import {
  SolarSystemAnchor,
  SolarSystemName,
  SolarSystemSecurityStatusBadge,
  TimeAgoText,
} from "@jitaspace/ui";

import { ZkillboardRecentSystemKills } from "~/components/Travel/ZkillboardRecentSystemKills";


type RouteTableProps = {
  route: {
    id: number | string;
  }[];
};

export const RouteTable = memo(({ route }: RouteTableProps) => {
  const { data: systemKillsData } = useAllSolarSystemKills();

  const systemKills = useMemo(() => {
    const index: Record<
      string,
      { npcKills: number; podKills: number; shipKills: number }
    > = {};
    systemKillsData?.data.forEach(
      (system) =>
        (index[system.system_id] = {
          npcKills: system.npc_kills,
          podKills: system.pod_kills,
          shipKills: system.ship_kills,
        }),
    );
    return index;
  }, [systemKillsData]);

  const killStatisticsDate: Date | null = useMemo(() => {
    const headerValue = systemKillsData?.headers?.["last-modified"];
    if (headerValue) return new Date(headerValue);
    return null;
  }, [systemKillsData]);

  return (
    <Table highlightOnHover>
      <thead>
        <tr>
          <th rowSpan={2} style={{ verticalAlign: "bottom" }}>
            Jump
          </th>
          <th rowSpan={2} style={{ verticalAlign: "bottom" }}>
            Solar System
          </th>
          <th colSpan={2}>
            <Group gap="xs">
              <Text>Kill Statistics </Text>
              <Tooltip
                color="dark"
                label={
                  <Text size="xs">
                    Updated{" "}
                    {killStatisticsDate && (
                      <TimeAgoText span date={killStatisticsDate} addSuffix />
                    )}
                    . Updates hourly
                  </Text>
                }
              >
                <div>
                  <InfoIcon width={20} />
                </div>
              </Tooltip>
            </Group>
          </th>
          <th rowSpan={2} style={{ verticalAlign: "bottom" }}>
            Recent Kills
            <br />
            <Text size="xs">
              Powered by{" "}
              <Anchor href="https://zkillboard.com" target="_blank">
                zKillboard
              </Anchor>
            </Text>
          </th>
        </tr>
        <tr>
          <th>Ships</th>
          <th>Pods</th>
        </tr>
      </thead>
      <tbody>
        {route.map((node, index) => (
          <tr key={node.id}>
            <td align="right">{index == 0 ? "Start" : index}</td>
            <td>
              <Group>
                <SolarSystemSecurityStatusBadge solarSystemId={node.id} />
                <SolarSystemAnchor solarSystemId={node.id} target="_blank">
                  <SolarSystemName solarSystemId={node.id} />
                </SolarSystemAnchor>
              </Group>
            </td>
            <td>{systemKills[node.id]?.shipKills ?? 0}</td>
            <td>{systemKills[node.id]?.podKills ?? 0}</td>
            <td>
              {/*(systemKills[node.id]?.shipKills ?? 0) +
                (systemKills[node.id]?.podKills ?? 0) >
                0 && <ZkillboardRecentSystemKills solarSystemId={node.id} />*/}
              <ZkillboardRecentSystemKills solarSystemId={node.id} />
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
});
RouteTable.displayName = "RouteTable";
