import { Text, type TextProps } from "@mantine/core";

import { useGetAlliancesAllianceId } from "~/esi/alliance";

type Props = TextProps & {
  allianceId?: number;
};
export default function AllianceNameText({ allianceId, ...otherProps }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { data } = useGetAlliancesAllianceId(allianceId!, undefined, {
    swr: { enabled: allianceId !== undefined },
  });
  return <Text {...otherProps}>{data && data.data.name}</Text>;
}
