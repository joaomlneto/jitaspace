import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useGetUniverseBloodlines } from "@jitaspace/esi-client";

export type BloodlineNameProps = TextProps & {
  bloodlineId?: string | number;
};

export const BloodlineName = memo(
  ({ bloodlineId, ...otherProps }: BloodlineNameProps) => {
    const { data, isLoading } = useGetUniverseBloodlines();

    const bloodline = data?.data.find((r) => r.bloodline_id == bloodlineId);

    if (!bloodline || isLoading)
      return (
        <Skeleton>
          <Text {...otherProps}>Unknown bloodline</Text>
        </Skeleton>
      );
    return <Text {...otherProps}>{bloodline.name}</Text>;
  },
);
BloodlineName.displayName = "BloodlineName";
