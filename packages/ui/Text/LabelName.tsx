import { Text, type TextProps } from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";
import { humanLabelName } from "@jitaspace/utils";

type Props = TextProps & {
  labelId?: string | number;
};

export function LabelName({ labelId, ...otherProps }: Props) {
  const { data: session } = useSession();

  const { data: labels } = useGetCharactersCharacterIdMailLabels(
    session?.user?.id ?? 1,
    undefined,
    {
      swr: {
        enabled: !!session?.user?.id,
      },
    },
  );

  return (
    <Text {...otherProps}>
      {humanLabelName(
        labels?.data.labels?.find((label) => label.label_id == labelId),
      )}
    </Text>
  );
}