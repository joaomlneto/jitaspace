import { memo } from "react";
import { Text, type TextProps } from "@mantine/core";

import { useGetCorporationsCorporationId } from "@jitaspace/esi-client";

export type CorporationNameProps = TextProps & {
  corporationId: string | number;
};

export const CorporationName = memo(
  ({ corporationId, ...otherProps }: CorporationNameProps) => {
    const { data } = useGetCorporationsCorporationId(
      typeof corporationId === "string"
        ? parseInt(corporationId, 10)
        : corporationId,
      undefined,
      {
        swr: { enabled: corporationId !== undefined },
      },
    );
    return <Text {...otherProps}>{data && data.data.name}</Text>;
  },
);
CorporationName.displayName = "CorporationName";
