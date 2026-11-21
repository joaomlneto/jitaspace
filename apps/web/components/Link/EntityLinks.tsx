"use client";

import type { ReactNode } from "react";

import type { EntityKind, EntityLinks } from "@jitaspace/ui";
import { EntityLinksProvider } from "@jitaspace/ui";

import { HoverPrefetchLink } from "./HoverPrefetchLink";

/** The web app's page for each kind of entity the shared cards show. */
export const entityHref = (kind: EntityKind, id: number): string => {
  switch (kind) {
    case "alliance":
      return `/alliance/${id}`;
    case "category":
      return `/category/${id}`;
    case "character":
      return `/character/${id}`;
    case "corporation":
      return `/corporation/${id}`;
    case "faction":
      return `/faction/${id}`;
    case "group":
      return `/group/${id}`;
    case "killmail":
      return `/kill/${id}`;
    case "solar_system":
      return `/system/${id}`;
    case "type":
      return `/type/${id}`;
    case "war":
      return `/war/${id}`;
  }
};

const WEB_ENTITY_LINKS: EntityLinks = {
  href: entityHref,
  component: HoverPrefetchLink,
};

/**
 * Gives `@jitaspace/ui`'s entity cards the web app's routes, linked with
 * `HoverPrefetchLink`. A client component so the root layout, a server
 * component, can mount it: the routes are a function, which cannot cross from
 * server to client as a prop.
 */
export const WebEntityLinksProvider = ({
  children,
}: {
  children: ReactNode;
}) => (
  <EntityLinksProvider links={WEB_ENTITY_LINKS}>{children}</EntityLinksProvider>
);
