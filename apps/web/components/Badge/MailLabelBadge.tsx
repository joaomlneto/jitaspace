import { Badge, type BadgeProps } from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";

type Props = BadgeProps & {
  labelId?: string | number;
};
export default function MailLabelBadge({ labelId, ...otherProps }: Props) {
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
      {labels?.data.labels?.find((label) => label.label_id == labelId)?.name ??
        labelId}
    </Badge>
  );
}
