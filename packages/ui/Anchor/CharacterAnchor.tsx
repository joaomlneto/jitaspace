import React, { memo } from "react";
import { type LinkProps } from "next/link";
import { type AnchorProps } from "@mantine/core";

import { EveEntityAnchor } from "./EveEntityAnchor";

export type CharacterNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    characterId?: string | number;
  };

export const CharacterAnchor = memo(
  ({ characterId, children, ...otherProps }: CharacterNameAnchorProps) => {
    return (
      <EveEntityAnchor
        entityId={characterId}
        category="character"
        {...otherProps}
      >
        {children}
      </EveEntityAnchor>
    );
  },
);
CharacterAnchor.displayName = "CharacterNameAnchor";
