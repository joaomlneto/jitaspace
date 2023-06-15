import { memo } from "react";
import { Anchor, type AnchorProps } from "@mantine/core";

import { EveEntityName } from "../Text";

export type EveEntityNameAnchorProps = AnchorProps & {
  entityId: string | number;
};

export const EveEntityNameAnchor = memo(
  ({ entityId, ...props }: EveEntityNameAnchorProps) => {
    return (
      <Anchor {...props}>
        <EveEntityName entityId={entityId} />
      </Anchor>
    );
  },
);
EveEntityNameAnchor.displayName = "EveEntityNameAnchor";
