"use client";

import type { TimelineProps } from "@mantine/core";
import { memo } from "react";

import { useCorporationAllianceHistory } from "@jitaspace/hooks";

import { CorporationAllianceHistoryTimelineDisplay } from "./CorporationAllianceHistoryTimelineDisplay";

export type CorporationAllianceHistoryTimelineProps = Omit<
  TimelineProps,
  "children"
> & {
  corporationId?: number;
};

export const CorporationAllianceHistoryTimeline = memo(
  ({
    corporationId,
    ...otherProps
  }: CorporationAllianceHistoryTimelineProps) => {
    const { data } = useCorporationAllianceHistory(corporationId ?? 0);
    return (
      <CorporationAllianceHistoryTimelineDisplay
        history={data?.data}
        {...otherProps}
      />
    );
  },
);
CorporationAllianceHistoryTimeline.displayName =
  "CorporationAllianceHistoryTimeline";
