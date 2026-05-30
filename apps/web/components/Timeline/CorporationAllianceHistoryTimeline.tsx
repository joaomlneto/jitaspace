"use client";

import { memo } from "react";
import { type TimelineProps } from "@mantine/core";
import { useCorporationAllianceHistory } from "@jitaspace/hooks";
import { CorporationAllianceHistoryTimeline as UICorporationAllianceHistoryTimeline } from "@jitaspace/ui";

export type CorporationAllianceHistoryTimelineProps = Omit<TimelineProps, "children"> & {
  corporationId?: number;
};

export const CorporationAllianceHistoryTimeline = memo(
  ({ corporationId, ...otherProps }: CorporationAllianceHistoryTimelineProps) => {
    const { data } = useCorporationAllianceHistory(corporationId ?? 0);
    return (
      <UICorporationAllianceHistoryTimeline
        history={data?.data}
        {...otherProps}
      />
    );
  },
);
CorporationAllianceHistoryTimeline.displayName = "CorporationAllianceHistoryTimeline";
