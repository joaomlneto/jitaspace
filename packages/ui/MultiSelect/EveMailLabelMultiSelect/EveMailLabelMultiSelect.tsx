"use client";

import type { MultiSelectProps } from "@mantine/core";
import { memo } from "react";
import { MultiSelect } from "@mantine/core";

import { humanLabelName } from "@jitaspace/utils";

export interface MailLabel {
  label_id?: number;
  name?: string;
  color?: string;
  unread_count?: number;
}

type EmailLabelMultiSelectProps = Omit<MultiSelectProps, "data"> & {
  labels?: MailLabel[];
};

export const EveMailLabelMultiSelect = memo(
  ({ labels, ...otherProps }: EmailLabelMultiSelectProps) => {
    return (
      <MultiSelect
        label="Labels"
        clearable
        data={
          labels?.map((label) => ({
            value: `${label.label_id}`,
            label: humanLabelName(label),
            unreadCount: label.unread_count ?? 0,
          })) ?? []
        }
        {...otherProps}
      />
    );
  },
);
EveMailLabelMultiSelect.displayName = "EveMailLabelMultiSelect";
