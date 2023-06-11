import { memo } from "react";
import { Avatar, type AvatarProps } from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailMailId } from "@jitaspace/esi-client";
import { GroupListIcon } from "@jitaspace/eve-icons";

import { AllianceAvatar } from "./AllianceAvatar";
import { CharacterAvatar, CorporationAvatar } from "./index";

export type EveMailRecipientAvatarProps = Omit<AvatarProps, "src"> & {
  messageId?: number;
  recipientId?: number;
};

export const EveMailRecipientAvatar = memo(
  ({ messageId, recipientId, ...otherProps }: EveMailRecipientAvatarProps) => {
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
      return <Avatar {...otherProps} />;
    }

    const recipient = (mail?.data.recipients ?? []).find(
      (recipient) => recipient.recipient_id === recipientId,
    );

    console.log("recipient:", recipient);

    if (recipient) {
      switch (recipient.recipient_type) {
        case "character":
          return <CharacterAvatar characterId={recipientId} {...otherProps} />;
        case "corporation":
          return (
            <CorporationAvatar corporationId={recipientId} {...otherProps} />
          );
        case "alliance":
          return <AllianceAvatar allianceId={recipientId} {...otherProps} />;
        case "mailing_list":
          return <GroupListIcon width={26} height={26} alt="Mailing List" />;
        default:
          return <Avatar {...otherProps} />;
      }
    }
  },
);
EveMailRecipientAvatar.displayName = "EveMailRecipientAvatar";
