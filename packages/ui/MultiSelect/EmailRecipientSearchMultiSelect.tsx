"use client";

import React, { memo } from "react";

import {
  EsiSearchMultiSelect,
  type EsiSearchMultiSelectProps,
} from "../MultiSelect";


export type EmailRecipientSearchMultiSelect = Omit<
  EsiSearchMultiSelectProps,
  "categories"
>;
export const EmailRecipientSearchMultiSelect = memo(
  (props: EmailRecipientSearchMultiSelect) => {
    return (
      <EsiSearchMultiSelect
        categories={["character", "corporation", "alliance"]}
        {...props}
      />
    );
  },
);
EmailRecipientSearchMultiSelect.displayName = "EmailRecipientSearchMultiSelect";
