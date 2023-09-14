import { memo } from "react";
import Link, { type LinkProps } from "next/link";
import { Anchor, type AnchorProps } from "@mantine/core";

export type CategoryNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    categoryId?: string | number;
  };

export const CategoryAnchor = memo(
  ({ categoryId, children, ...otherProps }: CategoryNameAnchorProps) => {
    if (categoryId === undefined) {
      return children;
    }

    return (
      <Anchor component={Link} href={`/category/${categoryId}`} {...otherProps}>
        {children}
      </Anchor>
    );
  },
);
CategoryAnchor.displayName = "CategoryNameAnchor";
