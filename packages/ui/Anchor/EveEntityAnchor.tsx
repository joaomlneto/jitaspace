import { memo, useMemo } from "react";
import Link from "next/link";
import { Anchor, Skeleton, type AnchorProps } from "@mantine/core";

import {
  useEsiName,
  type ResolvableEntityCategory,
} from "@jitaspace/esi-client";

export type EveEntityAnchorProps = Omit<AnchorProps, "component" | "href"> & {
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
