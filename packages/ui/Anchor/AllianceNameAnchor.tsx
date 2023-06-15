import { memo } from "react";
import { Anchor, type AnchorProps } from "@mantine/core";

import { AllianceName } from "../Text";

export type AllianceNameAnchorProps = AnchorProps & {
  allianceId: string | number;
};

export const AllianceNameAnchor = memo(
  ({ allianceId, ...props }: AllianceNameAnchorProps) => {
    return (
      <Anchor {...props}>
        <AllianceName allianceId={allianceId} />
      </Anchor>
    );
  },
);
AllianceNameAnchor.displayName = "AllianceNameAnchor";
