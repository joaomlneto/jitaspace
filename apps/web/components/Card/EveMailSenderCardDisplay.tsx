"use client";

import { memo } from "react";
import { Skeleton, Text } from "@mantine/core";

import { EveEntityCard } from "./EveEntityCard";

export interface EveMailSenderCardDisplayProps {
  senderId?: number;
  isLoading?: boolean;
}

export const EveMailSenderCardDisplay = memo(
  ({ senderId, isLoading }: EveMailSenderCardDisplayProps) => {
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
EveMailSenderCardDisplay.displayName = "EveMailSenderCardDisplay";
