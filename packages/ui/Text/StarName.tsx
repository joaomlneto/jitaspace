"use client";

import React, { memo } from "react";
import { Text, type TextProps } from "@mantine/core";

import { useGetUniverseStarsStarId } from "@jitaspace/esi-client";





export type StarNameProps = TextProps & {
  starId?: number;
};
export const StarName = memo(({ starId, ...otherProps }: StarNameProps) => {
  const { data } = useGetUniverseStarsStarId(
    starId ?? 0,
    {},
    {},
    { query: { enabled: !!starId } },
  );
  return <Text {...otherProps}>{data?.data.name}</Text>;
});
StarName.displayName = "StarName";
