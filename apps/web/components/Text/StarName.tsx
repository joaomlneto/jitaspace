"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { useStar } from "@jitaspace/hooks";
import { StarName as UIStarName } from "@jitaspace/ui";

export type StarNameProps = TextProps & {
  starId?: number;
};

export const StarName = memo(({ starId, ...otherProps }: StarNameProps) => {
  const { data } = useStar(starId ?? 0);
  return <UIStarName name={data?.data.name} {...otherProps} />;
});
StarName.displayName = "StarName";
