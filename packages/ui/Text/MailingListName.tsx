import { memo } from "react";
import { Text, type TextProps } from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailLists } from "@jitaspace/esi-client";

export type MailingListNameProps = TextProps & {
  mailingListId?: number;
};

export const MailingListName = memo(
  ({ mailingListId, ...otherProps }: MailingListNameProps) => {
    const { data: session } = useSession();

    const { data } = useGetCharactersCharacterIdMailLists(
      session?.user.id ?? 1,
      undefined,
      {
        swr: {
          enabled: !!session?.user.id,
        },
      },
    );
    return (
      <Text {...otherProps}>
        {data?.data.find((list) => list.mailing_list_id === mailingListId)
          ?.name ?? "Unknown Mailing List"}
      </Text>
    );
  },
);
MailingListName.displayName = "MailingListName";
