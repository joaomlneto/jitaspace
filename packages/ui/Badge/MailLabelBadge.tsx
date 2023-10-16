import { memo } from "react";
import { Badge, type BadgeProps } from "@mantine/core";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/esi-hooks";

export type MailLabelBadgeProps = BadgeProps & {
  labelId?: string | number;
};
export const MailLabelBadge = memo(
  ({ labelId, ...otherProps }: MailLabelBadgeProps) => {
    const { characterId, isTokenValid, accessToken } = useEsiClientContext();

    const { data: labels } = useGetCharactersCharacterIdMailLabels(
      characterId ?? 1,
      { token: accessToken },
      {},
      {
        query: {
          enabled: isTokenValid,
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
