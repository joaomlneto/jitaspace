import {
  type AvatarProps,
  type ColorSwatchProps,
  type MantineNumberSize,
} from "@mantine/core";

import { AllianceAvatar, CorporationAvatar } from "@jitaspace/ui";

import { MailLabelColorSwatch } from "~/components/ColorSwatch";

type MailLabelIconProps = Partial<AvatarProps & ColorSwatchProps> & {
  labelId: string | number;
  size: MantineNumberSize;
};

export function MailLabelIcon({ labelId, ...otherProps }: MailLabelIconProps) {
  if (labelId == "4" || labelId == 4) {
    return <CorporationAvatar corporationId={1} {...otherProps} />;
  }
  if (labelId == "8" || labelId == 8) {
    return <AllianceAvatar allianceId={1} {...otherProps} />;
  }
  return <MailLabelColorSwatch labelId={labelId} {...otherProps} />;
}
