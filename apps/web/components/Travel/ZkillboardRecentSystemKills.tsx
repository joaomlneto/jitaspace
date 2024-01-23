import React, { memo, useMemo } from "react";
import { Group, Loader, Spoiler, Stack, Text } from "@mantine/core";
import { subHours } from "date-fns";
import useSWR from "swr";

import { EveEntityName, TimeAgoText } from "@jitaspace/ui";

import { KillmailButton } from "./KillmailButton";


type ZkillboardRecentSystemKillsProps = {
  solarSystemId: number | string;
  pastSeconds?: number;
};

type ZkillboardKill = {
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
};

export const ZkillboardRecentSystemKills = memo(
  ({ solarSystemId, pastSeconds = 3600 }: ZkillboardRecentSystemKillsProps) => {
    const { data, error, isLoading, isValidating } = useSWR<{
      body: ZkillboardKill[] | undefined;
      headers: Headers;
    }>(
      `https://zkillboard.com/api/systemID/${solarSystemId}/pastSeconds/${pastSeconds}/`,
      (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, init).then(async (res) => {
          const headers = res.headers;
          const bodyClone = res.clone();
          const body = (await bodyClone.json()) as ZkillboardKill[];
          return { body, headers };
        }),
      {
        //refreshInterval: 3000,
        errorRetryInterval: 2000,
        shouldRetryOnError: true,
        revalidateOnFocus: false,
        revalidateIfStale: true,
        revalidateOnReconnect: true,
        revalidateOnMount: true,
      },
    );

    // retrieve the date of when result was generated
    const lastChecked = useMemo(() => {
      const expiresHeader = data?.headers?.get("Expires");
      if (expiresHeader == null) return null;
      const expires = new Date(expiresHeader);
      return subHours(expires, 1);
    }, [data]);

    const locations = useMemo(
      () => [...new Set((data?.body ?? []).map((kill) => kill.zkb.locationID))],
      [data?.body],
    );

    const locationKills = useMemo(() => {
      const index: Record<number, ZkillboardKill[]> = {};
      locations.forEach((location) => {
        index[location] = (data?.body ?? []).filter(
          (kill) => kill.zkb.locationID === location,
        );
      });
      return index;
    }, [locations, data?.body]);

    if (isLoading || isValidating || data?.body === undefined)
      return (
        <Group>
          <Loader size="sm" />
          Loading recent kills from zKillboard
        </Group>
      );

    return (
      <>
        <Stack gap="xs">
          {lastChecked && (
            <Text size="xs" c="dimmed">
              Last checked <TimeAgoText span date={lastChecked} addSuffix />.
              Updates hourly.
            </Text>
          )}
          {locations.map((location) => (
            <Group gap="xs">
              {(locationKills[location] ?? []).length}{" "}
              <EveEntityName inherit entityId={location} />
            </Group>
          ))}
          <Spoiler
            maxHeight={0}
            hideLabel="Collapse"
            showLabel={`Show ${(data?.body ?? []).length} kills`}
          >
            {locations.map((location) => (
              <>
                <EveEntityName inherit entityId={location} />
                {(data?.body ?? [])
                  .filter((kill) => kill.zkb.locationID === location)
                  .map((kill) => (
                    <Group>
                      <KillmailButton
                        killmailId={kill.killmail_id}
                        killmailHash={kill.zkb.hash}
                      />
                    </Group>
                  ))}
              </>
            ))}
          </Spoiler>
        </Stack>
      </>
    );
  },
);
ZkillboardRecentSystemKills.displayName = "ZkillboardRecentSystemKills";
