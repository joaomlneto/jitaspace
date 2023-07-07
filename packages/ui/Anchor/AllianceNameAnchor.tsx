import { memo } from "react";
import Link from "next/link";
import { Anchor, type AnchorProps } from "@mantine/core";

import { AllianceName } from "../Text";

export type AllianceNameAnchorProps = AnchorProps & {
  allianceId: string | number;
};

export const AllianceNameAnchor = memo(
  ({ allianceId, ...props }: AllianceNameAnchorProps) => {
    return (
      <Anchor component={Link} href={`/alliances/${allianceId}`} {...props}>
        <AllianceName span allianceId={allianceId} />
      </Anchor>
    );
  },
);
AllianceNameAnchor.displayName = "AllianceNameAnchor";
