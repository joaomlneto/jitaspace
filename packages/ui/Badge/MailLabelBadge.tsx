import { memo } from "react";
import { Badge, type BadgeProps } from "@mantine/core";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";





export type MailLabelBadgeProps = BadgeProps & {
  characterId: number;
  labelId?: string | number;
};
export const MailLabelBadge = memo(
  ({ characterId, labelId, ...otherProps }: MailLabelBadgeProps) => {
    const { accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-mail.read_mail.v1"],
    });

    const { data: labels } = useGetCharactersCharacterIdMailLabels(
      characterId ?? 1,
      {},
      { ...authHeaders },
      {
        query: {
          enabled: accessToken !== null,
        },
      },
    );

    return (
      <Badge {...otherProps}>
        {labels?.data.labels?.find((label) => label.label_id == labelId)
          ?.name ?? labelId}
      </Badge>
    );
  },
);
MailLabelBadge.displayName = "MailLabelBadge";
