"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo, useMemo } from "react";
import { Anchor } from "@mantine/core";

import type { ResolvableEntityCategory } from "@jitaspace/hooks";
import { useEsiName } from "@jitaspace/hooks";

import { EveEntityAnchorDisplay } from "./EveEntityAnchorDisplay";

export type EveEntityAnchorProps = Omit<AnchorProps, "component" | "href"> &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    entityId?: string | number | null;
    category?: ResolvableEntityCategory;
  };

export const EveEntityAnchor = memo(
  ({
    entityId,
    category: categoryHint,
    children,
    prefetch,
    ...props
  }: EveEntityAnchorProps) => {
    const { category: resolvedCategory } = useEsiName(
      entityId ?? undefined,
      categoryHint,
    );

    // `useEsiName` reports the category off the *resolved* cache entry, so it
    // stays undefined until the name lookup lands. Callers like `TypeAnchor`
    // and `CharacterAnchor` already know the category statically, and the
    // destination follows from the id alone — so prefer the hint and emit a
    // real href on first render instead of rendering it unlinked.
    const category = categoryHint ?? resolvedCategory;

    const url = useMemo(() => {
      if (!entityId || !category) return undefined;
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
          return undefined;
      }
    }, [category, entityId]);

    // No destination yet (no id, an unresolved or unroutable category): render
    // the children unlinked rather than linking "#", which would point at, and
    // on hover prefetch, the current page. Like CorporationAnchor, `prefetch`
    // stays off the plain Anchor so it never reaches the DOM.
    if (url === undefined) {
      return <Anchor {...props}>{children}</Anchor>;
    }

    return (
      <EveEntityAnchorDisplay href={url} prefetch={prefetch} {...props}>
        {children}
      </EveEntityAnchorDisplay>
    );
  },
);
EveEntityAnchor.displayName = "EveEntityAnchor";
