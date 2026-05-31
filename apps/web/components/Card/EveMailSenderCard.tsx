"use client";

import { memo } from "react";
import { useCharacterMail } from "@jitaspace/hooks";
import { EveMailSenderCard as UIEveMailSenderCard } from "@jitaspace/ui";

export type EveMailSenderCardProps = {
  characterId?: number;
  messageId?: number;
};

export const EveMailSenderCard = memo(({ characterId, messageId }: EveMailSenderCardProps) => {
  const { data, isLoading } = useCharacterMail(characterId ?? 0, messageId);
  return (
    <UIEveMailSenderCard
      senderId={data?.data.from}
      isLoading={isLoading}
    />
  );
});
EveMailSenderCard.displayName = "EveMailSenderCard";
