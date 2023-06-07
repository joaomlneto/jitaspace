import { memo } from "react";
import { Badge, type BadgeProps } from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";

export type MailLabelBadgeProps = BadgeProps & {
  labelId?: string | number;
};
export const MailLabelBadge = memo(
  ({ labelId, ...otherProps }: MailLabelBadgeProps) => {
    const { data: session } = useSession();

    const { data: labels } = useGetCharactersCharacterIdMailLabels(
      session?.user?.id ?? 1,
      undefined,
      {
        swr: {
          enabled: !!session?.user?.id,
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
