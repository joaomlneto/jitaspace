import React from "react";
import { Text, type TextProps } from "@mantine/core";

import {
  AllianceName,
  CharacterName,
  CorporationName,
  EveEntityName,
  MailingListName,
} from "./index";

type Props = TextProps & {
  id?: number;
  recipients?: {
    recipient_id: number;
    recipient_type: string;
  }[];
};
export function EveMailSenderName({ id, recipients, ...otherProps }: Props) {
  if (!id) {
    return <Text {...otherProps} />;
  }

  const recipient = recipients?.find(
    (recipient) => recipient.recipient_id === id,
  );

  if (recipient) {
    switch (recipient?.recipient_type) {
      case "character":
        return <CharacterName characterId={id} {...otherProps} />;
      case "corporation":
        return <CorporationName corporationId={id} {...otherProps} />;
      case "alliance":
        return <AllianceName allianceId={id} {...otherProps} />;
      case "mailing_list":
        return <MailingListName mailingListId={id} {...otherProps} />;
      default:
        return (
          <EveEntityName entityId={id} {...otherProps}>
            {id}
          </EveEntityName>
        );
    }
  }

  // Resolve wtf this is
  return <EveEntityName entityId={id} {...otherProps} />;
}
