"use client";

import type { TimelineProps } from "@mantine/core";
import React, { memo, useMemo } from "react";
import Link from "next/link";
import { Anchor, Badge, Group, Text, Timeline } from "@mantine/core";
import { format } from "date-fns";

import { AllianceAvatar } from "../Avatar";
import { AllianceName } from "../Text";

export type AllianceHistoryEntry = {
  alliance_id?: number;
  is_deleted?: boolean;
  record_id: number;
  start_date: string;
};

type AllianceHistoryEntryWithEnd = AllianceHistoryEntry & {
  end_date?: string;
};

type CorporationAllianceHistoryTimelineProps = Omit<
  TimelineProps,
  "children"
> & {
  history?: AllianceHistoryEntry[];
};

const getMembershipDatePreposition = (
  allianceMembership: AllianceHistoryEntryWithEnd,
) => {
  if (!allianceMembership.alliance_id) return "On";
  return allianceMembership.end_date ? "From" : "Since";
};

export const CorporationAllianceHistoryTimeline = memo(
  ({ history }: CorporationAllianceHistoryTimelineProps) => {
    const parsedCorporationAllianceHistory: AllianceHistoryEntryWithEnd[] =
      useMemo(() => {
        if (!history) return [];
        return history
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
      }, [history]);

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
              {getMembershipDatePreposition(allianceMembership)}{" "}
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
