import { memo } from "react";
import { type LinkProps } from "next/link";
import { Anchor, type AnchorProps } from "@mantine/core";

import {
  useEsiClientContext,
  useGetCharactersCharacterIdMailLists,
  useGetCharactersCharacterIdMailMailId,
} from "@jitaspace/esi-client";

import { EveEntityAnchor } from "./EveEntityAnchor";

export type EveMailSenderNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref"> & {
    messageId?: number;
  };
export const EveMailSenderAnchor = memo(
  ({ messageId, children, ...props }: EveMailSenderNameAnchorProps) => {
    const { characterId, isTokenValid } = useEsiClientContext();
    const { data: mail } = useGetCharactersCharacterIdMailMailId(
      characterId ?? 0,
      messageId ?? 0,
      undefined,
      {
        swr: {
          enabled: isTokenValid && !!messageId,
        },
      },
    );

    const { data: mailingLists } = useGetCharactersCharacterIdMailLists(
      characterId ?? 1,
      undefined,
      {
        swr: {
          enabled: isTokenValid,
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