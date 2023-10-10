import { memo } from "react";
import Link, { type LinkProps } from "next/link";
import { Anchor, type AnchorProps } from "@mantine/core";





export type DogmaAttributeAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    attributeId: string | number;
  };

export const DogmaAttributeAnchor = memo(
  ({ attributeId, children, ...otherProps }: DogmaAttributeAnchorProps) => {
    return (
      <Anchor
        component={Link}
        href={`/dogma/attribute/${attributeId}`}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
DogmaAttributeAnchor.displayName = "DogmaAttributeAnchor";
