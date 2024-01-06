import React, { memo, useMemo } from "react";
import Link from "next/link";
import {
  Anchor,
  Badge,
  Group,
  Text,
  Timeline,
  type TimelineProps,
} from "@mantine/core";
import { format } from "date-fns";

import {
  useGetCorporationsCorporationIdAlliancehistory,
  type GetCorporationsCorporationIdAlliancehistoryQueryResponse,
} from "@jitaspace/esi-client";

import { AllianceAvatar } from "../Avatar";
import { AllianceName } from "../Text";


type CorporationAllianceHistoryTimelineProps = Omit<
  TimelineProps,
  "children"
> & {
  corporationId?: string | number;
};
export const CorporationAllianceHistoryTimeline = memo(
  ({ corporationId }: CorporationAllianceHistoryTimelineProps) => {
    const { data } = useGetCorporationsCorporationIdAlliancehistory(
      typeof corporationId === "string"
        ? parseInt(corporationId)
        : corporationId ?? 0,
      {},
      {},
      { query: { enabled: !!corporationId } },
    );

    const parsedCorporationAllianceHistory: (GetCorporationsCorporationIdAlliancehistoryQueryResponse[number] & {
      end_date?: string;
    })[] = useMemo(() => {
      if (!data?.data) return [];
      return data.data
        .map((allianceMembership, index, array) => {
          const end_date =
            allianceMembership.alliance_id &&
            index > 0 &&
            array[index - 1]?.alliance_id === undefined
              ? array[index - 1]?.start_date
              : undefined;
          return {
            ...allianceMembership,
            end_date,
          };
        })
        .filter(
          (allianceMembership, index, array) =>
            allianceMembership.alliance_id !== undefined ||
            index === array.length - 1,
        )
        .sort((a, b) => b.record_id - a.record_id);
    }, [data?.data]);

    return (
      <Timeline active={-1} bulletSize={32} lineWidth={2}>
        {parsedCorporationAllianceHistory.map((allianceMembership) => (
          <Timeline.Item
            bullet={
              <AllianceAvatar
                allianceId={allianceMembership.alliance_id}
                size={28}
              />
            }
            title={
              <Group>
                {allianceMembership.alliance_id ? (
                  <Anchor
                    component={Link}
                    href={`/alliance/${allianceMembership.alliance_id}`}
                  >
                    <AllianceName
                      span
                      allianceId={allianceMembership.alliance_id}
                    />
                  </Anchor>
                ) : (
                  <Text c="dimmed">Corporation Founded</Text>
                )}
                {allianceMembership.is_deleted && <Badge>Closed</Badge>}
              </Group>
            }
            key={allianceMembership.record_id}
          >
            <Text size="xs" mt={4}>
              {allianceMembership.alliance_id
                ? allianceMembership.end_date
                  ? "From"
                  : "Since"
                : "On"}{" "}
              {format(
                new Date(allianceMembership.start_date),
                "yyyy-MM-dd HH:mm",
              )}
              {allianceMembership.end_date && (
                <Text span size="xs" mt={4}>
                  {" "}
                  to{" "}
                  {format(
                    new Date(allianceMembership.end_date),
                    "yyyy-MM-dd HH:mm",
                  )}
                </Text>
              )}
              .
            </Text>
          </Timeline.Item>
        ))}
      </Timeline>
    );
  },
);
CorporationAllianceHistoryTimeline.displayName =
  "CorporationAllianceHistoryTimeline";
