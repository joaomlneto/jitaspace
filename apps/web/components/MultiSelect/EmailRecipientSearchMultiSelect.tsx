import React from "react";

import {
  EsiSearchMultiSelect,
  type EsiSearchMultiSelectProps,
} from "~/components/MultiSelect/EsiSearchMultiSelect";

export type EmailRecipientSearchMultiSelect = Omit<
  EsiSearchMultiSelectProps,
  "categories"
>;
export function EmailRecipientSearchMultiSelect(
  props: EmailRecipientSearchMultiSelect,
) {
  return (
    <EsiSearchMultiSelect
      categories={["character", "corporation", "alliance"]}
      {...props}
    />
  );
}