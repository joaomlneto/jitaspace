import React, { memo, useEffect, useMemo, useState } from "react";
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
    const { data, error, isLoading, isValidating } = useSWR(
      `https://zkillboard.com/api/systemID/${solarSystemId}/pastSeconds/${pastSeconds}/`,
      (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init),
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

    const [systemKills, setSystemKills] = useState<
      ZkillboardKill[] | undefined
    >();

    // retrieve the date of when result was generated
    const lastChecked = useMemo(() => {
      const expiresHeader = data?.headers?.get("Expires");
      if (expiresHeader == null) return undefined;
      const expires = new Date(expiresHeader);
      return subHours(expires, 1);
    }, [data]);

    useEffect(() => {
      if (!data) return;
      const clonedData = data.clone();
      const asyncSetTheData = async () => {
        try {
          const json = await clonedData.json();
          setSystemKills(json);
        } catch (e) {}
      };
      void asyncSetTheData();
    }, [data]);

    const locations = useMemo(
      () => [
        ...new Set((systemKills ?? []).map((kill) => kill.zkb.locationID)),
      ],
      [systemKills],
    );

    const locationKills = useMemo(() => {
      const index: Record<number, ZkillboardKill[]> = {};
      locations.forEach((location) => {
        index[location] = (systemKills ?? []).filter(
          (kill) => kill.zkb.locationID === location,
        );
      });
      return index;
    }, [locations, systemKills]);

    if (isLoading || isValidating || systemKills === undefined)
      return (
        <Group>
          <Loader size="sm" />
          Loading recent kills from zKillboard
        </Group>
      );

    return (
      <>
        <Stack spacing="xs">
          {lastChecked && (
            <Text size="xs" color="dimmed">
              Last checked <TimeAgoText span date={lastChecked} addSuffix />.
              Updates hourly.
            </Text>
          )}
          {locations.map((location) => (
            <Group spacing="xs">
              {(locationKills[location] ?? []).length}{" "}
              <EveEntityName entityId={location} />
            </Group>
          ))}
          <Spoiler
            maxHeight={0}
            hideLabel="Collapse"
            showLabel={`Show ${(systemKills ?? []).length} kills`}
          >
            {locations.map((location) => (
              <>
                <EveEntityName entityId={location} />
                {(systemKills ?? [])
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
