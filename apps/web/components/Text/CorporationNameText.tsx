import { Text, type TextProps } from "@mantine/core";

import { useGetCorporationsCorporationId } from "@jitaspace/esi-client";

type Props = TextProps & {
  corporationId?: number;
};
export default function CorporationNameText({
  corporationId,
  ...otherProps
}: Props) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { data } = useGetCorporationsCorporationId(corporationId!, undefined, {
    swr: { enabled: corporationId !== undefined },
  });
  return <Text {...otherProps}>{data && data.data.name}</Text>;
}
