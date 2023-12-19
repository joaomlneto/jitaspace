import { memo } from "react";
import { ColorSwatch, type ColorSwatchProps } from "@mantine/core";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";





export type MailLabelColorSwatchProps = Omit<ColorSwatchProps, "color"> & {
  characterId: number;
  labelId?: string | number;
};

export const MailLabelColorSwatch = memo(
  ({ characterId, labelId, ...otherProps }: MailLabelColorSwatchProps) => {
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
          enabled: !!labelId && accessToken !== null,
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
