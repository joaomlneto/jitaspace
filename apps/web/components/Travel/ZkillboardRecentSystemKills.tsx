import React, { memo } from "react";
import { Group, Loader, Spoiler, Stack } from "@mantine/core";
import useSWR from "swr";

import { EveEntityName } from "@jitaspace/ui";

import { KillmailButton } from "./KillmailButton";

type ZkillboardRecentSystemKillsProps = {
  solarSystemId: number | string;
  pastSeconds?: number;
};

export const ZkillboardRecentSystemKills = memo(
  ({ solarSystemId, pastSeconds = 3600 }: ZkillboardRecentSystemKillsProps) => {
    const { data, error, isLoading, isValidating } = useSWR<
      {
        killmail_id: number;
        zkb: {
          locationID: number;
          hash: string;
          fittedValue: number;
          droppedValue: number;
          destroyedValue: number;
          totalValue: number;
          points: number;
          npc: boolean;
          solo: boolean;
          awox: boolean;
        };
      }[]
    >(
      `https://zkillboard.com/api/systemID/${solarSystemId}/pastSeconds/${pastSeconds}/`,
      (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, init).then((res) => res.json()),
      {
        revalidateIfStale: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        errorRetryInterval: 1500,
      },
    );

    if (isLoading || isValidating || !data)
      return (
        <Group>
          <Loader size="sm" />
          Loading recent kills from zKillboard
        </Group>
      );

    return (
      <>
        <Spoiler
          maxHeight={100}
          hideLabel="Collapse"
          showLabel={`Show all ${(data ?? []).length} kills`}
        >
          <Stack spacing="xs">
            {(data ?? []).map((kill) => (
              <Group>
                <KillmailButton
                  killmailId={kill.killmail_id}
                  killmailHash={kill.zkb.hash}
                />
                <EveEntityName entityId={kill.zkb.locationID} />
              </Group>
            ))}
          </Stack>
        </Spoiler>
      </>
    );
  },
);
ZkillboardRecentSystemKills.displayName = "ZkillboardRecentSystemKills";
