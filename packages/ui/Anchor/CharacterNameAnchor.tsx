import { memo } from "react";
import { Anchor, type AnchorProps } from "@mantine/core";

import { CharacterName } from "../Text";

export type CharacterNameAnchorProps = AnchorProps & {
  characterId: string | number;
};

export const CharacterNameAnchor = memo(
  ({ characterId, ...props }: CharacterNameAnchorProps) => {
    return (
      <Anchor {...props}>
        <CharacterName characterId={characterId} />
      </Anchor>
    );
  },
);
CharacterNameAnchor.displayName = "CharacterNameAnchor";
