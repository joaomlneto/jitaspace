import { memo } from "react";
import { type LinkProps } from "next/link";
import { type AnchorProps } from "@mantine/core";

import { EveEntityAnchor } from "./EveEntityAnchor";

export type SolarSystemAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    solarSystemId?: number | string;
  };

export const SolarSystemAnchor = memo(
  ({ solarSystemId, children, ...props }: SolarSystemAnchorProps) => {
    return (
      <EveEntityAnchor
        entityId={solarSystemId}
        category="solar_system"
        {...props}
      >
        {children}
      </EveEntityAnchor>
    );
  },
);
SolarSystemAnchor.displayName = "SolarSystemAnchor";
