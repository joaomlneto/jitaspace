import { Anchor, type AnchorProps } from "@mantine/core";

import { CharacterName } from "../Text";

export type CharacterNameAnchorProps = AnchorProps & {
  characterId: string | number;
};

export function CharacterNameAnchor({
  characterId,
  ...props
}: CharacterNameAnchorProps) {
  return (
    <Anchor {...props}>
      <CharacterName characterId={characterId} />
    </Anchor>
  );
}
