import { Text, type TextProps } from "@mantine/core";

import { useGetCorporationsCorporationId } from "@jitaspace/esi-client";

type Props = TextProps & {
  corporationId: string | number;
};
export function CorporationName({ corporationId, ...otherProps }: Props) {
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
}
