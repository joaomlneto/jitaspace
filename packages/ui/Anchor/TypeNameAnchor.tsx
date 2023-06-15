import { Anchor, type AnchorProps } from "@mantine/core";

import { TypeName } from "../Text";

export type TypeNameAnchorProps = AnchorProps & {
  typeId: number | string;
};

export function TypeNameAnchor({ typeId, ...props }: TypeNameAnchorProps) {
  return (
    <Anchor {...props}>
      <TypeName typeId={typeId} />
    </Anchor>
  );
}
