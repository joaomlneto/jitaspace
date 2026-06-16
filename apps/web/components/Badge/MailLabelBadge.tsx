"use client";

import type { BadgeProps } from "@mantine/core";
import { memo } from "react";

import { useCharacterMailLabels } from "@jitaspace/hooks";
import { MailLabelBadge as UIMailLabelBadge } from "@jitaspace/ui";

export type MailLabelBadgeProps = BadgeProps & {
  characterId?: number;
  labelId?: number;
};

export const MailLabelBadge = memo(
  ({ characterId, labelId, ...otherProps }: MailLabelBadgeProps) => {
    const { data } = useCharacterMailLabels(characterId ?? 0);
    const label = data?.data.labels?.find((l) => l.label_id === labelId);
    return <UIMailLabelBadge labelName={label?.name} {...otherProps} />;
  },
);
MailLabelBadge.displayName = "MailLabelBadge";
