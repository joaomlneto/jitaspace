import { memo } from "react";
import { type LinkProps } from "next/link";
import { type AnchorProps } from "@mantine/core";

import { EveEntityNameAnchor } from "./EveEntityNameAnchor";

export type CharacterNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref"> & {
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
