import React from "react";
import { Text, type TextProps } from "@mantine/core";

import { EveEntityNameText, MailingListNameText } from "./index";

type Props = TextProps & {
  id?: number;
  recipients?: {
    recipient_id: number;
    recipient_type: string;
  }[];
};
export default function EveMailSenderNameText({
  id,
  recipients,
  ...otherProps
}: Props) {
  if (!id) {
    return <Text {...otherProps} />;
  }

  const recipient = recipients?.find(
    (recipient) => recipient.recipient_id === id,
  );
  if (recipient) {
    switch (recipient?.recipient_type) {
      /*case "character":
        return <CharacterNameText characterId={id} {...otherProps} />;
      case "corporation":
        return <CorporationNameText corporationId={id} {...otherProps} />;
      case "alliance":
        return <AllianceNameText allianceId={id} {...otherProps} />;*/
      case "mailing_list":
        return <MailingListNameText mailingListId={id} {...otherProps} />;
      default:
        return (
          <EveEntityNameText entityId={id} {...otherProps}>
            {id}
          </EveEntityNameText>
        );
    }
  }
  /*
  if (isIdInRanges(id, characterIdRanges)) {
    return <CharacterNameText characterId={id} {...otherProps} />;
  }

  if (isIdInRanges(id, corporationIdRanges)) {
    return (
      <CorporationNameText corporationId={id} {...otherProps} color="teal" />
    );
  }

  if (isIdInRanges(id, allianceIdRanges)) {
    return <AllianceNameText allianceId={id} {...otherProps} />;
  }*/

  // Resolve wtf this is
  return <EveEntityNameText entityId={id} {...otherProps} />;
}
