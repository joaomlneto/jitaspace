"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo, useMemo } from "react";

import type { ResolvableEntityCategory } from "@jitaspace/hooks";
import { useEsiName } from "@jitaspace/hooks";
import { EveEntityAnchorDisplay } from "@jitaspace/ui";

export type EveEntityAnchorProps = Omit<AnchorProps, "component" | "href"> &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    entityId?: string | number | null;
    category?: ResolvableEntityCategory;
  };

export const EveEntityAnchor = memo(
  ({
    entityId,
    category: categoryHint,
    children,
    ...props
  }: EveEntityAnchorProps) => {
    const { category } = useEsiName(entityId ?? undefined, categoryHint);

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
    }, [category, entityId]);

    return (
      <EveEntityAnchorDisplay href={url} {...props}>
        {children}
      </EveEntityAnchorDisplay>
    );
  },
);
EveEntityAnchor.displayName = "EveEntityAnchor";
