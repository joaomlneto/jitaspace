import { ColorSwatch, type ColorSwatchProps } from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";

type Props = Omit<ColorSwatchProps, "color"> & {
  labelId?: string | number;
};

export default function MailLabelColorSwatch({
  labelId,
  ...otherProps
}: Props) {
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
    <ColorSwatch
      color={
        labels?.data.labels?.find((label) => label.label_id == labelId)
          ?.color ?? "primary"
      }
      {...otherProps}
    />
  );
}