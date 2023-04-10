import { type AvatarProps } from "@mantine/core";

import EveEntityAvatar from "./EveEntityAvatar";

type Props = Omit<AvatarProps, "src"> & {
  allianceId?: string | number | null;
};

export default function AllianceAvatar({ allianceId, ...otherProps }: Props) {
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
