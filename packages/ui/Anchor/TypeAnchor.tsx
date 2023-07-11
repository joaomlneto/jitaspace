import { memo } from "react";
import { type LinkProps } from "next/link";
import { type AnchorProps } from "@mantine/core";

import { EveEntityAnchor } from "./EveEntityAnchor";

export type TypeNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref"> & {
    typeId: number | string;
  };

export const TypeAnchor = memo(
  ({ typeId, children, ...props }: TypeNameAnchorProps) => {
    return (
      <EveEntityAnchor entityId={typeId} category="inventory_type" {...props}>
        {children}
      </EveEntityAnchor>
    );
  },
);
TypeAnchor.displayName = "TypeNameAnchor";
