import { memo } from "react";
import { ColorSwatch, type ColorSwatchProps } from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";

export type MailLabelColorSwatchProps = Omit<ColorSwatchProps, "color"> & {
  labelId?: string | number;
};

export const MailLabelColorSwatch = memo(
  ({ labelId, ...otherProps }: MailLabelColorSwatchProps) => {
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
  },
);
MailLabelColorSwatch.displayName = "MailLabelColorSwatch";
