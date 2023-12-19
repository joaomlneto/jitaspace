import { memo } from "react";
import { type LinkProps } from "next/link";
import { Anchor, type AnchorProps } from "@mantine/core";

import {
  useGetCharactersCharacterIdMailLists,
  useGetCharactersCharacterIdMailMailId,
} from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";

import { EveEntityAnchor } from "./EveEntityAnchor";


export type EveMailSenderNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    characterId: number;
    messageId?: number;
  };
export const EveMailSenderAnchor = memo(
  ({
    characterId,
    messageId,
    children,
    ...props
  }: EveMailSenderNameAnchorProps) => {
    const { accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-mail.read_mail.v1"],
    });
    const { data: mail } = useGetCharactersCharacterIdMailMailId(
      characterId ?? 0,
      messageId ?? 0,
      {},
      { ...authHeaders },
      {
        query: {
          enabled: accessToken !== null && !!messageId,
        },
      },
    );

    const { data: mailingLists } = useGetCharactersCharacterIdMailLists(
      characterId ?? 1,
      {},
      { ...authHeaders },
      {
        query: {
          enabled: accessToken !== null,
        },
      },
    );

    // if it is a mailing list, do not link to anything.
    if (
      mailingLists?.data.some(
        (mailList) => mailList.mailing_list_id === mail?.data.from,
      )
    ) {
      return <Anchor {...props}>{children}</Anchor>;
    }

    return (
      <EveEntityAnchor entityId={mail?.data.from} {...props}>
        {children}
      </EveEntityAnchor>
    );
  },
);
EveMailSenderAnchor.displayName = "EveMailSenderNameAnchor";
