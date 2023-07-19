import { memo } from "react";
import { type LinkProps } from "next/link";
import { type AnchorProps } from "@mantine/core";

import { EveEntityAnchor } from "./EveEntityAnchor";

export type StationNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    stationId: string | number;
  };

export const StationAnchor = memo(
  ({ stationId, children, ...otherProps }: StationNameAnchorProps) => {
    return (
      <EveEntityAnchor entityId={stationId} category="station" {...otherProps}>
        {children}
      </EveEntityAnchor>
    );
  },
);
StationAnchor.displayName = "StationAnchor";
