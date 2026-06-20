"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { useBloodline } from "@jitaspace/hooks";
import { BloodlineName as UIBloodlineName } from "@jitaspace/ui";

export type BloodlineNameProps = TextProps & {
  bloodlineId?: number;
};

export const BloodlineName = memo(
  ({ bloodlineId, ...otherProps }: BloodlineNameProps) => {
    const { data: bloodline } = useBloodline(bloodlineId ?? 0);
    return <UIBloodlineName name={bloodline?.name} {...otherProps} />;
  },
);
BloodlineName.displayName = "BloodlineName";
