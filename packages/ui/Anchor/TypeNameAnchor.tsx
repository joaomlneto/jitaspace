import { memo } from "react";
import { Anchor, type AnchorProps } from "@mantine/core";

import { TypeName } from "../Text";

export type TypeNameAnchorProps = AnchorProps & {
  typeId: number | string;
};

export const TypeNameAnchor = memo(
  ({ typeId, ...props }: TypeNameAnchorProps) => {
    return (
      <Anchor {...props}>
        <TypeName typeId={typeId} />
      </Anchor>
    );
  },
);
TypeNameAnchor.displayName = "TypeNameAnchor";
