import React, { memo } from "react";
import { Text, type TextProps } from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailMailId } from "@jitaspace/esi-client";

import {
  AllianceName,
  CharacterName,
  CorporationName,
  EveEntityName,
  MailingListName,
} from "./index";

export type EveMailRecipientNameProps = TextProps & {
  messageId?: number;
  recipientId?: number;
};
export const EveMailRecipientName = memo(
  ({ messageId, recipientId, ...otherProps }: EveMailRecipientNameProps) => {
    const { data: session } = useSession();

    const { data: mail } = useGetCharactersCharacterIdMailMailId(
      session?.user.id ?? 0,
      messageId ?? 0,
      undefined,
      {
        swr: {
          enabled: !!session?.user.id && !!messageId,
        },
      },
    );

    if (!recipientId) {
      return <Text {...otherProps} />;
    }

    const recipient = (mail?.data.recipients ?? []).find(
      (recipient) => recipient.recipient_id === recipientId,
    );

    if (recipient) {
      switch (recipient?.recipient_type) {
        case "alliance":
          return <AllianceName allianceId={recipientId} {...otherProps} />;
        case "character":
          return <CharacterName characterId={recipientId} {...otherProps} />;
        case "corporation":
          return (
            <CorporationName corporationId={recipientId} {...otherProps} />
          );
        case "mailing_list":
          return (
            <MailingListName mailingListId={recipientId} {...otherProps} />
          );
      }
    }

    // this should never happen, but it's here just in case :)
    return <EveEntityName entityId={recipientId} {...otherProps} />;
  },
);
EveMailRecipientName.displayName = "EveMailRecipientName";
