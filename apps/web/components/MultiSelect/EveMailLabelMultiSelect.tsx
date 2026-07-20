"use client";

import type { MultiSelectProps } from "@mantine/core";
import { memo } from "react";

import { useCharacterMailLabels } from "@jitaspace/hooks";
import { EveMailLabelMultiSelect as UIEveMailLabelMultiSelect } from "@jitaspace/ui";

export type EveMailLabelMultiSelectProps = Omit<MultiSelectProps, "data"> & {
  characterId?: number;
};

export const EveMailLabelMultiSelect = memo(
  ({ characterId, ...otherProps }: EveMailLabelMultiSelectProps) => {
    const { data } = useCharacterMailLabels(characterId ?? 0);
    return (
      <UIEveMailLabelMultiSelect labels={data?.data.labels} {...otherProps} />
    );
  },
);
EveMailLabelMultiSelect.displayName = "EveMailLabelMultiSelect";
