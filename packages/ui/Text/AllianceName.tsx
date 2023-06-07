import { memo } from "react";
import { Text, type TextProps } from "@mantine/core";

import { useGetAlliancesAllianceId } from "@jitaspace/esi-client";

export type AllianceNameProps = TextProps & {
  allianceId: string | number;
};

export const AllianceName = memo(
  ({ allianceId, ...otherProps }: AllianceNameProps) => {
    const { data } = useGetAlliancesAllianceId(
      typeof allianceId === "string" ? parseInt(allianceId, 10) : allianceId,
      undefined,
      {
        swr: { enabled: allianceId !== undefined },
      },
    );
    return <Text {...otherProps}>{data && data.data.name}</Text>;
  },
);
AllianceName.displayName = "AllianceName";
