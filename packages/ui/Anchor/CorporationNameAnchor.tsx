import { memo } from "react";
import { Anchor, type AnchorProps } from "@mantine/core";

import { CorporationName } from "../Text";

export type CorporationNameAnchorProps = AnchorProps & {
  corporationId: string | number;
};

export const CorporationNameAnchor = memo(
  ({ corporationId, ...props }: CorporationNameAnchorProps) => {
    return (
      <Anchor {...props}>
        <CorporationName corporationId={corporationId} />
      </Anchor>
    );
  },
);
CorporationNameAnchor.displayName = "CorporationNameAnchor";
