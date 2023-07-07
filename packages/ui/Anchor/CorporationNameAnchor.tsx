import { memo } from "react";
import Link from "next/link";
import { Anchor, type AnchorProps } from "@mantine/core";

import { CorporationName } from "../Text";

export type CorporationNameAnchorProps = AnchorProps & {
  corporationId: string | number;
};

export const CorporationNameAnchor = memo(
  ({ corporationId, ...props }: CorporationNameAnchorProps) => {
    return (
      <Anchor
        component={Link}
        href={`/corporation/${corporationId}/`}
        {...props}
      >
        <CorporationName span corporationId={corporationId} />
      </Anchor>
    );
  },
);
CorporationNameAnchor.displayName = "CorporationNameAnchor";
