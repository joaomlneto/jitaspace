import Image from "next/image";
import { Avatar, type AvatarProps } from "@mantine/core";

import {
  allianceIdRanges,
  characterIdRanges,
  corporationIdRanges,
  isIdInRanges,
} from "@jitaspace/utils";

import { AllianceAvatar } from "./AllianceAvatar";
import {
  CharacterAvatar,
  CorporationAvatar,
  UnknownCategoryEveEntityAvatar,
} from "./index";

type Props = Omit<AvatarProps, "src"> & {
  id?: number;
  recipients?: {
    recipient_id: number;
    recipient_type: string;
  }[];
};

export function EveMailSenderAvatar({ id, recipients, ...otherProps }: Props) {
  if (!id) {
    return <Avatar {...otherProps} />;
  }

  const recipient = recipients?.find(
    (recipient) => recipient.recipient_id === id,
  );

  if (recipient) {
    switch (recipient.recipient_type) {
      case "character":
        return <CharacterAvatar characterId={id} {...otherProps} />;
      case "corporation":
        return <CorporationAvatar corporationId={id} {...otherProps} />;
      case "alliance":
        return <AllianceAvatar allianceId={id} {...otherProps} />;
      case "mailing_list":
        return (
          <Image
            src="/icons/grouplist.png"
            width={26}
            height={26}
            alt="Mailing List"
          />
        );
      default:
        return <Avatar {...otherProps} />;
    }
  }

  if (isIdInRanges(id, characterIdRanges)) {
    return <CharacterAvatar characterId={id} {...otherProps} />;
  }

  if (isIdInRanges(id, corporationIdRanges)) {
    return <CorporationAvatar corporationId={id} {...otherProps} />;
  }

  if (isIdInRanges(id, allianceIdRanges)) {
    return <AllianceAvatar allianceId={id} {...otherProps} />;
  }

  return <UnknownCategoryEveEntityAvatar id={id} {...otherProps} />;
}
