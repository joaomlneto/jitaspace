import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useGetUniverseMoonsMoonId } from "@jitaspace/esi-client-kubb";





export type MoonNameProps = TextProps & {
  moonId?: number;
};

export const MoonName = memo(({ moonId, ...otherProps }: MoonNameProps) => {
  const { data, isLoading } = useGetUniverseMoonsMoonId(
    moonId ?? 1,
    {},
    {},
    { query: { enabled: !!moonId } },
  );
  if (isLoading)
    return (
      <Skeleton>
        <Text {...otherProps}>Unknown moon</Text>
      </Skeleton>
    );
  return <Text {...otherProps}>{data?.data.name}</Text>;
});
MoonName.displayName = "MoonName";
