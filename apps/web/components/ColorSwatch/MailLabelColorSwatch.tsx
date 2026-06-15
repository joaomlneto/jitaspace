"use client";

import type { ColorSwatchProps } from "@mantine/core";
import { memo } from "react";

import { useCharacterMailLabels } from "@jitaspace/hooks";
import { MailLabelColorSwatch as UIMailLabelColorSwatch } from "@jitaspace/ui";

export type MailLabelColorSwatchProps = Omit<ColorSwatchProps, "color"> & {
  characterId?: number;
  labelId?: number;
};

export const MailLabelColorSwatch = memo(
  ({ characterId, labelId, ...otherProps }: MailLabelColorSwatchProps) => {
    const { data } = useCharacterMailLabels(characterId ?? 0);
    const label = data?.data.labels?.find((l) => l.label_id === labelId);
    return <UIMailLabelColorSwatch color={label?.color} {...otherProps} />;
  },
);
MailLabelColorSwatch.displayName = "MailLabelColorSwatch";
