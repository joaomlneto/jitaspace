import { memo } from "react";
import { ColorSwatch, type ColorSwatchProps } from "@mantine/core";

import {
  useEsiClientContext,
  useGetCharactersCharacterIdMailLabels,
} from "@jitaspace/esi-client";

export type MailLabelColorSwatchProps = Omit<ColorSwatchProps, "color"> & {
  labelId?: string | number;
};

export const MailLabelColorSwatch = memo(
  ({ labelId, ...otherProps }: MailLabelColorSwatchProps) => {
    const { characterId, isTokenValid } = useEsiClientContext();

    const { data: labels } = useGetCharactersCharacterIdMailLabels(
      characterId ?? 1,
      undefined,
      {
        swr: {
          enabled: isTokenValid,
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
