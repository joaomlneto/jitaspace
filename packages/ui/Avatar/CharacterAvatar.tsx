import { type AvatarProps } from "@mantine/core";

import { EveEntityAvatar } from "./EveEntityAvatar";

export type CharacterAvatarProps = Omit<AvatarProps, "src"> & {
  characterId?: number | string | null;
};

export function CharacterAvatar({
  characterId,
  ...otherProps
}: CharacterAvatarProps) {
  return (
    <EveEntityAvatar
      category="characters"
      id={characterId ?? "1"}
      variation="portrait"
      size={otherProps.size}
      {...otherProps}
    />
  );
}
