import { memo } from "react";
import { Text, type TextProps } from "@mantine/core";

import {
  useEsiClientContext,
  useGetCharactersCharacterIdMailLabels,
} from "@jitaspace/esi-client";
import { humanLabelName } from "@jitaspace/utils";

export type LabelNameProps = TextProps & {
  labelId?: string | number;
};

export const LabelName = memo(({ labelId, ...otherProps }: LabelNameProps) => {
  const { characterId, isTokenValid } = useEsiClientContext();

  const { data: labels } = useGetCharactersCharacterIdMailLabels(
    characterId ?? 1,
    undefined,
    {
      swr: {
        enabled: isTokenValid,
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
