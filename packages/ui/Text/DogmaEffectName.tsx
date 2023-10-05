import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useGetDogmaEffectsEffectId } from "@jitaspace/esi-client-kubb";

export type DogmaEffectNameProps = TextProps & {
  effectId?: number;
};

export const DogmaEffectName = memo(
  ({ effectId, ...otherProps }: DogmaEffectNameProps) => {
    const { data, isLoading } = useGetDogmaEffectsEffectId(
      effectId ?? 1,
      {},
      { swr: { enabled: !!effectId } },
    );
    if (isLoading)
      return (
        <Skeleton>
          <Text {...otherProps}>Unknown effect</Text>
        </Skeleton>
      );

    const name =
      data?.data.display_name && data?.data.display_name.length > 0
        ? data?.data.display_name
        : data?.data.name;

    return <Text {...otherProps}>{name}</Text>;
  },
);
DogmaEffectName.displayName = "DogmaEffectName";
