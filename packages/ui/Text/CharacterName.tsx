import React, { memo } from "react";
import { type TextProps } from "@mantine/core";

import { EveEntityName } from "./EveEntityName";

export type CharacterNameProps = TextProps & {
  characterId: string | number;
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
