import { Anchor, type AnchorProps } from "@mantine/core";

import { EveEntityName } from "../Text";

export type EveEntityNameAnchorProps = AnchorProps & {
  entityId: string | number;
};

export function EveEntityNameAnchor({
  entityId,
  ...props
}: EveEntityNameAnchorProps) {
  return (
    <Anchor {...props}>
      <EveEntityName entityId={entityId} />
    </Anchor>
  );
}
