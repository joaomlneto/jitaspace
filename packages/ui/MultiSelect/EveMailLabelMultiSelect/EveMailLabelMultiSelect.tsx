import React, { memo } from "react";
import { MultiSelect, type MultiSelectProps } from "@mantine/core";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/esi-hooks";
import { humanLabelName } from "@jitaspace/utils";

import { EveMailLabelMultiSelectItem } from "./EveMailLabelMultiSelectItem";
import { EmailLabelMultiSelectValue } from "./EveMailLabelMultiSelectValue";

type EmailLabelMultiSelectProps = Omit<MultiSelectProps, "data">;

export const EveMailLabelMultiSelect = memo(
  (props: EmailLabelMultiSelectProps) => {
    const { characterId, isTokenValid, accessToken } = useEsiClientContext();

    const { data: labels } = useGetCharactersCharacterIdMailLabels(
      characterId ?? 0,
      {
        token: accessToken,
      },
      {},
      {
        query: {
          enabled: isTokenValid,
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
  },
);
EveMailLabelMultiSelect.displayName = "EveMailLabelMultiSelect";
