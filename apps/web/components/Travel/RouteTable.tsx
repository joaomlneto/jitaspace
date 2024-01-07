import {InfoIcon} from "@jitaspace/eve-icons";
import {useAllSolarSystemKills} from "@jitaspace/hooks";
import {SolarSystemAnchor, SolarSystemName, SolarSystemSecurityStatusBadge, TimeAgoText,} from "@jitaspace/ui";
import {Anchor, Group, Table, Text, Tooltip} from "@mantine/core";
import React, {memo, useMemo} from "react";

import {ZkillboardRecentSystemKills} from "~/components/Travel/ZkillboardRecentSystemKills";


type RouteTableProps = {
  route: {
    id: number | string;
  }[];
};

export const RouteTable = memo(({route}: RouteTableProps) => {
  const {data: systemKillsData} = useAllSolarSystemKills();

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
      <Table.Thead>
        <Table.Tr>
          <th rowSpan={2} style={{verticalAlign: "bottom"}}>
            Jump
          </th>
          <th rowSpan={2} style={{verticalAlign: "bottom"}}>
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
                      <TimeAgoText span date={killStatisticsDate} addSuffix/>
                    )}
                    . Updates hourly
                  </Text>
                }
              >
                <div>
                  <InfoIcon width={20}/>
                </div>
              </Tooltip>
            </Group>
          </th>
          <th rowSpan={2} style={{verticalAlign: "bottom"}}>
            Recent Kills
            <br/>
            <Text size="xs">
              Powered by{" "}
              <Anchor href="https://zkillboard.com" target="_blank">
                zKillboard
              </Anchor>
            </Text>
          </th>
        </Table.Tr>
        <Table.Tr>
          <th>Ships</th>
          <th>Pods</th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {route.map((node, index) => (
          <Table.Tr key={node.id}>
            <Table.Td align="right">{index == 0 ? "Start" : index}</Table.Td>
            <Table.Td>
              <Group>
                <SolarSystemSecurityStatusBadge solarSystemId={node.id}/>
                <SolarSystemAnchor solarSystemId={node.id} target="_blank">
                  <SolarSystemName solarSystemId={node.id}/>
                </SolarSystemAnchor>
              </Group>
            </Table.Td>
            <Table.Td>{systemKills[node.id]?.shipKills ?? 0}</Table.Td>
            <Table.Td>{systemKills[node.id]?.podKills ?? 0}</Table.Td>
            <Table.Td>
              {/*(systemKills[node.id]?.shipKills ?? 0) +
                (systemKills[node.id]?.podKills ?? 0) >
                0 && <ZkillboardRecentSystemKills solarSystemId={node.id} />*/}
              <ZkillboardRecentSystemKills solarSystemId={node.id}/>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
});
RouteTable.displayName = "RouteTable";
