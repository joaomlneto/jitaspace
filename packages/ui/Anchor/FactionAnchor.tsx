import React, { memo } from "react";
import { type LinkProps } from "next/link";
import { type AnchorProps } from "@mantine/core";

import { EveEntityAnchor } from "./EveEntityAnchor";


export type FactionNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    factionId?: string | number | null;
  };

export const FactionAnchor = memo(
  ({ factionId, children, ...otherProps }: FactionNameAnchorProps) => {
    return (
      <EveEntityAnchor entityId={factionId} category="faction" {...otherProps}>
        {children}
      </EveEntityAnchor>
    );
  },
);
FactionAnchor.displayName = "FactionNameAnchor";
