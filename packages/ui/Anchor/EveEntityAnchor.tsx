import { memo, useMemo } from "react";
import Link, { type LinkProps } from "next/link";
import { Anchor, Skeleton, type AnchorProps } from "@mantine/core";

import { useEsiName, type ResolvableEntityCategory } from "@jitaspace/hooks";

export type EveEntityAnchorProps = Omit<AnchorProps, "component" | "href"> &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    entityId?: string | number;
    category?: ResolvableEntityCategory;
  };

export const EveEntityAnchor = memo(
  ({
    entityId,
    category: categoryHint,
    children,
    ...props
  }: EveEntityAnchorProps) => {
    const { category } = useEsiName(entityId, categoryHint);

    const url = useMemo(() => {
      if (!entityId || !category) return "#";
      switch (category) {
        case "agent":
          return `/character/${entityId}`;
        case "alliance":
        case "character":
        case "constellation":
        case "corporation":
        case "faction":
        case "region":
        case "station":
        case "structure":
          return `/${category}/${entityId}`;
        case "inventory_type":
          return `/type/${entityId}`;
        case "solar_system":
          return `/system/${entityId}`;
        default:
          return "#";
      }
      return `/${category}/${entityId}`;
    }, [category, entityId]);

    if (!url) {
      return (
        <Skeleton>
          <Anchor {...props}>{children}</Anchor>
        </Skeleton>
      );
    }

    return (
      <Anchor component={Link} href={url} {...props}>
        {children}
      </Anchor>
    );
  },
);
EveEntityAnchor.displayName = "EveEntityAnchor";
