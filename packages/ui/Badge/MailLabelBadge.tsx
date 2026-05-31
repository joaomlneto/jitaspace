"use client";

import type { BadgeProps } from "@mantine/core";
import { memo } from "react";
import { Badge } from "@mantine/core";

export type MailLabelBadgeProps = BadgeProps & {
  labelName?: string;
};

export const MailLabelBadge = memo(
  ({ labelName, ...otherProps }: MailLabelBadgeProps) => {
    return <Badge {...otherProps}>{labelName}</Badge>;
  },
);
MailLabelBadge.displayName = "MailLabelBadge";
