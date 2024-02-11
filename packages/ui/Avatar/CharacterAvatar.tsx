"use client";

import { memo } from "react";
import { type AvatarProps } from "@mantine/core";

import { EveImageServerAvatar } from "./EveImageServerAvatar";


export type CharacterAvatarProps = Omit<AvatarProps, "src"> & {
  characterId?: number | string | null;
};

export const CharacterAvatar = memo(
  ({ characterId, ...otherProps }: CharacterAvatarProps) => {
    return (
      <EveImageServerAvatar
        category="characters"
        id={characterId}
        variation="portrait"
        size={otherProps.size}
        {...otherProps}
      />
    );
  },
);
CharacterAvatar.displayName = "CharacterAvatar";
