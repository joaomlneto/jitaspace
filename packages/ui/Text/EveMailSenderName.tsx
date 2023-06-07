import React, { memo } from "react";
import { type TextProps } from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailMailId } from "@jitaspace/esi-client";

import { EveEntityName } from "./index";

export type EveMailSenderNameProps = TextProps & {
  messageId?: number;
};
export const EveMailSenderName = memo(
  ({ messageId, ...otherProps }: EveMailSenderNameProps) => {
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

    return <EveEntityName entityId={mail?.data.from} {...otherProps} />;
  },
);
EveMailSenderName.displayName = "EveMailSenderName";
