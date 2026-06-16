"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { useCharacterMailingLists } from "@jitaspace/hooks";
import { MailingListName as UIMailingListName } from "@jitaspace/ui";

export type MailingListNameProps = TextProps & {
  characterId?: number;
  mailingListId?: number;
};

export const MailingListName = memo(
  ({ characterId, mailingListId, ...otherProps }: MailingListNameProps) => {
    const { data } = useCharacterMailingLists(characterId ?? 0);
    const mailingList = data?.data.find(
      (ml) => ml.mailing_list_id === mailingListId,
    );
    return <UIMailingListName name={mailingList?.name} {...otherProps} />;
  },
);
MailingListName.displayName = "MailingListName";
