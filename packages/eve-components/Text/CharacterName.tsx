"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { EveEntityName } from "./EveEntityName";

export type CharacterNameProps = TextProps & {
  characterId?: string | number;
};

export const CharacterName = memo(
  ({ characterId, ...otherProps }: CharacterNameProps) => {
    return (
      <EveEntityName
        entityId={characterId}
        category="character"
        {...otherProps}
      />
    );
  },
);
CharacterName.displayName = "CharacterName";
