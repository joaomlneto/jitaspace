import { memo } from "react";
import { type AnchorProps } from "@mantine/core";

import { EveEntityNameAnchor } from "./EveEntityNameAnchor";

export type CharacterNameAnchorProps = AnchorProps & {
  characterId?: string | number;
};

export const CharacterNameAnchor = memo(
  ({ characterId, ...props }: CharacterNameAnchorProps) => {
    return (
      <EveEntityNameAnchor
        entityId={characterId}
        category="character"
        {...props}
      />
    );
  },
);
CharacterNameAnchor.displayName = "CharacterNameAnchor";
