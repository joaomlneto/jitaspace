"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { useCharacterMailLabels } from "@jitaspace/hooks";
import { LabelName as UILabelName } from "@jitaspace/ui";

export type LabelNameProps = TextProps & {
  characterId?: number;
  labelId?: number;
};

export const LabelName = memo(
  ({ characterId, labelId, ...otherProps }: LabelNameProps) => {
    const { data } = useCharacterMailLabels(characterId ?? 0);
    const label = data?.data.labels?.find((l) => l.label_id === labelId);
    return <UILabelName name={label?.name} {...otherProps} />;
  },
);
LabelName.displayName = "LabelName";
