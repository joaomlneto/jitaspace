"use client";

import type { AnchorProps } from "@mantine/core";
import type { ElementType, ReactNode } from "react";
import { createContext, useContext } from "react";
import { Anchor, Text } from "@mantine/core";

import type { EntityKind } from "./types";

/**
 * How the cards link the entities they show. `@jitaspace/ui` knows no routes,
 * so the app supplies them: where each kind of entity's page is, and the link
 * component to render (the web app's `HoverPrefetchLink`).
 */
export interface EntityLinks {
  /** The page for an entity, or `undefined` where there is none. */
  href: (kind: EntityKind, id: number) => string | undefined;
  /** Rendered as the anchor's `component`; a plain `<a>` when omitted. */
  component?: ElementType;
}

const EntityLinksContext = createContext<EntityLinks | null>(null);

/**
 * Supplies the entity cards' links. Without it, cards render entity names as
 * plain text.
 */
export const EntityLinksProvider = ({
  links,
  children,
}: {
  links: EntityLinks;
  children: ReactNode;
}) => <EntityLinksContext value={links}>{children}</EntityLinksContext>;

/** The links in effect, or `null` outside an `EntityLinksProvider`. */
export const useEntityLinks = () => useContext(EntityLinksContext);

export type EntityAnchorProps = Omit<AnchorProps, "component" | "href"> & {
  kind: EntityKind;
  id: number;
  children: ReactNode;
};

/**
 * An entity's name, linked to its page where the app supplied one, else as
 * plain text in the same style.
 */
export const EntityAnchor = ({
  kind,
  id,
  children,
  ...anchorProps
}: EntityAnchorProps) => {
  const links = useEntityLinks();
  const href = links?.href(kind, id);
  if (href === undefined) {
    return (
      <Text span {...anchorProps}>
        {children}
      </Text>
    );
  }
  // Mantine's polymorphic types cannot take an arbitrary component; the app's
  // link component renders an <a>, so type it as one.
  const component = (links?.component ?? "a") as "a";
  return (
    <Anchor component={component} href={href} {...anchorProps}>
      {children}
    </Anchor>
  );
};
