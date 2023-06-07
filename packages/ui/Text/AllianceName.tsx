import { Text, type TextProps } from "@mantine/core";

import { useGetAlliancesAllianceId } from "@jitaspace/esi-client";

type Props = TextProps & {
  allianceId: string | number;
};
export function AllianceName({ allianceId, ...otherProps }: Props) {
  const { data } = useGetAlliancesAllianceId(
    typeof allianceId === "string" ? parseInt(allianceId, 10) : allianceId,
    undefined,
    {
      swr: { enabled: allianceId !== undefined },
    },
  );
  return <Text {...otherProps}>{data && data.data.name}</Text>;
}
