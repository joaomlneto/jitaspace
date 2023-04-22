import { Text, type TextProps } from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailLists } from "@jitaspace/esi-client";

type Props = TextProps & {
  mailingListId?: number;
};
export default function MailingListNameText({
  mailingListId,
  ...otherProps
}: Props) {
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
}
