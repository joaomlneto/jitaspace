"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { useAsteroidBelt } from "@jitaspace/hooks";
import { AsteroidBeltName as UIAsteroidBeltName } from "@jitaspace/ui";

export type AsteroidBeltNameProps = TextProps & {
  asteroidBeltId?: number;
};

export const AsteroidBeltName = memo(
  ({ asteroidBeltId, ...otherProps }: AsteroidBeltNameProps) => {
    const { data } = useAsteroidBelt(asteroidBeltId);
    return <UIAsteroidBeltName name={data?.name} {...otherProps} />;
  },
);
AsteroidBeltName.displayName = "AsteroidBeltName";
