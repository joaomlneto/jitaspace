"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { useStargate } from "@jitaspace/hooks";
import { StargateName as UIStargateName } from "@jitaspace/ui";

export type StargateNameProps = TextProps & {
  stargateId?: number;
};

export const StargateName = memo(
  ({ stargateId, ...otherProps }: StargateNameProps) => {
    const { data } = useStargate(stargateId);
    return <UIStargateName name={data?.name} {...otherProps} />;
  },
);
StargateName.displayName = "StargateName";
