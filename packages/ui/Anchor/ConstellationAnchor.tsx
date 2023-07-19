import { memo } from "react";
import { type LinkProps } from "next/link";
import { type AnchorProps } from "@mantine/core";

import { EveEntityAnchor } from "./EveEntityAnchor";

export type ConstellationAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    constellationId?: number | string;
  };

export const ConstellationAnchor = memo(
  ({ constellationId, children, ...props }: ConstellationAnchorProps) => {
    return (
      <EveEntityAnchor
        entityId={constellationId}
        category="constellation"
        {...props}
      >
        {children}
      </EveEntityAnchor>
    );
  },
);
ConstellationAnchor.displayName = "ConstellationAnchor";
