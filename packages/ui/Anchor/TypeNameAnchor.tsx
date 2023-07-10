import { memo } from "react";
import { type LinkProps } from "next/link";
import { Anchor, type AnchorProps } from "@mantine/core";

import { TypeName } from "../Text";

export type TypeNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref"> & {
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
