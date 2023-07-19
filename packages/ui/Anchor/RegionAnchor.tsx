import { memo } from "react";
import { type LinkProps } from "next/link";
import { type AnchorProps } from "@mantine/core";

import { EveEntityAnchor } from "./EveEntityAnchor";

export type RegionAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    regionId?: number | string;
  };

export const RegionAnchor = memo(
  ({ regionId, children, ...props }: RegionAnchorProps) => {
    return (
      <EveEntityAnchor entityId={regionId} category="region" {...props}>
        {children}
      </EveEntityAnchor>
    );
  },
);
RegionAnchor.displayName = "RegionAnchor";
