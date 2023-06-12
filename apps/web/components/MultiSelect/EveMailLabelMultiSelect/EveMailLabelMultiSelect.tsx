import React from "react";
import { MultiSelect, type MultiSelectProps } from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";
import { humanLabelName } from "@jitaspace/utils";

import { EveMailLabelMultiSelectItem } from "./EveMailLabelMultiSelectItem";
import { EmailLabelMultiSelectValue } from "./EveMailLabelMultiSelectValue";

type EmailLabelMultiSelectProps = Omit<MultiSelectProps, "data">;

export function EveMailLabelMultiSelect(props: EmailLabelMultiSelectProps) {
  const { data: session } = useSession();

  const { data: labels } = useGetCharactersCharacterIdMailLabels(
    session?.user.id ?? 0,
    undefined,
    {
      swr: {
        enabled: !!session?.user?.id,
      },
    },
  );
  return (
    <MultiSelect
      label="Labels"
      clearable
      data={
        labels?.data.labels?.map((label) => ({
          value: `${label.label_id}`,
          label: humanLabelName(label),
          unreadCount: label.unread_count ?? 0,
        })) ?? []
      }
      itemComponent={EveMailLabelMultiSelectItem}
      valueComponent={EmailLabelMultiSelectValue}
      //placeholder="Choose labels"
      {...props}
    />
  );
}
