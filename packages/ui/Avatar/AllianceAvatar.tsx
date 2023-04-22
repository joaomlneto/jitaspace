import { type AvatarProps } from "@mantine/core";

import { EveEntityAvatar } from "./EveEntityAvatar";

export type AllianceAvatarProps = Omit<AvatarProps, "src"> & {
  allianceId?: string | number | null;
};

export function AllianceAvatar({
  allianceId,
  ...otherProps
}: AllianceAvatarProps) {
  return (
    <EveEntityAvatar
      category="alliances"
      id={`${allianceId}`}
      variation="logo"
      size={otherProps.size}
      {...otherProps}
    />
  );
}
