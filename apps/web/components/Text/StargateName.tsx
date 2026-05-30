"use client";

import { memo } from "react";
import { type TextProps } from "@mantine/core";
import { useStargate } from "@jitaspace/hooks";
import { StargateName as UIStargateName } from "@jitaspace/ui";

export type StargateNameProps = TextProps & {
  stargateId?: number;
};

export const StargateName = memo(({ stargateId, ...otherProps }: StargateNameProps) => {
  const { data } = useStargate(stargateId ?? 0);
  return <UIStargateName name={data?.data.name} {...otherProps} />;
});
StargateName.displayName = "StargateName";
