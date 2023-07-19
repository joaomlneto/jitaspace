import { memo } from "react";
import Link, { type LinkProps } from "next/link";
import { Anchor, type AnchorProps } from "@mantine/core";

export type StarNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    starId: string | number;
  };

export const StarAnchor = memo(
  ({ starId, children, ...otherProps }: StarNameAnchorProps) => {
    return (
      <Anchor component={Link} href={`/star/${starId}`} {...otherProps}>
        {children}
      </Anchor>
    );
  },
);
StarAnchor.displayName = "StarAnchor";
