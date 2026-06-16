"use client";

import React, { memo } from "react";
import { Skeleton, Text } from "@mantine/core";

import { EveEntityCard } from "./EveEntityCard";

export type EveMailSenderCardProps = {
  senderId?: number;
  isLoading?: boolean;
};

export const EveMailSenderCard = memo(
  ({ senderId, isLoading }: EveMailSenderCardProps) => {
    if (!senderId) {
      return (
        <Skeleton visible={isLoading}>
          <Text>Unknown</Text>
        </Skeleton>
      );
    }

    return <EveEntityCard entityId={senderId} />;
  },
);
EveMailSenderCard.displayName = "EveMailSenderCard";
