"use client";

import React, { memo } from "react";
import { MultiSelect, type MultiSelectProps } from "@mantine/core";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";
import { humanLabelName } from "@jitaspace/utils";





type EmailLabelMultiSelectProps = Omit<MultiSelectProps, "data"> & {
  characterId: number;
};

export const EveMailLabelMultiSelect = memo(
  ({ characterId, ...otherProps }: EmailLabelMultiSelectProps) => {
    const { accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-mail.read_mail.v1"],
    });
    const { data: labels } = useGetCharactersCharacterIdMailLabels(
      characterId ?? 0,
      {},
      { ...authHeaders },
      {
        query: {
          enabled: accessToken !== null,
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
            characterId,
            unreadCount: label.unread_count ?? 0,
          })) ?? []
        }
        //itemComponent={EveMailLabelMultiSelectItem}
        //valueComponent={valueComponent}
        //placeholder="Choose labels"
        {...otherProps}
      />
    );
  },
);
EveMailLabelMultiSelect.displayName = "EveMailLabelMultiSelect";
