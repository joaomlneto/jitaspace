import { memo } from "react";
import { Text, type TextProps } from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";
import { humanLabelName } from "@jitaspace/utils";

export type LabelNameProps = TextProps & {
  labelId?: string | number;
};

export const LabelName = memo(({ labelId, ...otherProps }: LabelNameProps) => {
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
});
LabelName.displayName = "LabelName";
