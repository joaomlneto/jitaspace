"use client";

import { memo } from "react";
import { Text, type TextProps } from "@mantine/core";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";
import { humanLabelName } from "@jitaspace/utils";





export type LabelNameProps = TextProps & {
  characterId: number;
  labelId?: string | number;
};

export const LabelName = memo(
  ({ characterId, labelId, ...otherProps }: LabelNameProps) => {
    const { accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-mail.read_mail.v1"],
    });

    const { data: labels } = useGetCharactersCharacterIdMailLabels(
      characterId ?? 1,
      {},
      { ...authHeaders },
      {
        query: {
          enabled: accessToken !== null,
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
  },
);
LabelName.displayName = "LabelName";
