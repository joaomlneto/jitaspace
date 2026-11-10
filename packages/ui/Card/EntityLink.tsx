"use client";

import type { TextProps } from "@mantine/core";
import type { ReactNode } from "react";
import { memo } from "react";
import { Group } from "@mantine/core";

import type { EntityKind, EntityRef } from "./types";
import {
  AllianceAvatar,
  CharacterAvatar,
  CorporationAvatar,
  FactionAvatar,
  TypeAvatar,
} from "../Avatar";
import { EveEntityNameDisplay } from "../Text";
import { EntityAnchor } from "./EntityLinks";

export type EntityLinkProps = TextProps & {
  kind: EntityKind;
  entity?: EntityRef;
  /** Show the entity's image before its name. */
  withAvatar?: boolean;
  /** Avatar size in pixels. */
  avatarSize?: number;
  /** Rendered before the avatar, e.g. "CEO:". */
  prefix?: ReactNode;
};

const EntityAvatar = ({
  kind,
  id,
  size,
}: {
  kind: EntityKind;
  id: number;
  size: number;
}) => {
  switch (kind) {
    case "alliance":
      return <AllianceAvatar allianceId={id} size={size} />;
    case "character":
      return <CharacterAvatar characterId={id} size={size} />;
    case "corporation":
      return <CorporationAvatar corporationId={id} size={size} />;
    case "faction":
      return <FactionAvatar factionId={id} size={size} />;
    case "type":
      return <TypeAvatar typeId={id} size={size} />;
    case "category":
    case "group":
    case "killmail":
    case "solar_system":
    case "war":
      return null;
  }
};

/**
 * An entity's avatar and linked name, on one line. Renders nothing without an
 * entity, and a skeleton in place of the name until it is resolved.
 */
export const EntityLink = memo(
  ({
    kind,
    entity,
    withAvatar = true,
    avatarSize = 16,
    prefix,
    size = "xs",
    ...textProps
  }: EntityLinkProps) => {
    if (!entity) return null;
    return (
      <Group gap={6} wrap="nowrap" miw={0}>
        {prefix}
        {withAvatar && (
          <EntityAvatar kind={kind} id={entity.id} size={avatarSize} />
        )}
        <EntityAnchor kind={kind} id={entity.id} size={size} miw={0} truncate>
          <EveEntityNameDisplay
            name={entity.name}
            loading={entity.name === undefined}
            size={size}
            span
            // Mantine's Text resets white-space, so the name has to opt out of
            // wrapping itself for the anchor's ellipsis to apply.
            truncate
            {...textProps}
          />
        </EntityAnchor>
      </Group>
    );
  },
);
EntityLink.displayName = "EntityLink";

export type EntityCardTitleProps = TextProps & {
  kind: EntityKind;
  entity: EntityRef;
  variant: "full" | "compact";
};

/** An entity card's linked title, sized for the card variant. */
export const EntityCardTitle = memo(
  ({ kind, entity, variant, ...textProps }: EntityCardTitleProps) => {
    const size = variant === "full" ? "lg" : "sm";
    return (
      <EntityAnchor
        kind={kind}
        id={entity.id}
        size={size}
        fw={500}
        truncate
        display="block"
      >
        <EveEntityNameDisplay
          name={entity.name}
          loading={entity.name === undefined}
          size={size}
          fw={500}
          span
          truncate
          {...textProps}
        />
      </EntityAnchor>
    );
  },
);
EntityCardTitle.displayName = "EntityCardTitle";

/** Avatar sizes for each card variant: 84px (with a medium radius) and 38px. */
export const entityCardAvatarProps = (variant: "full" | "compact") =>
  variant === "full"
    ? ({ size: 84, radius: "md" } as const)
    : ({ size: 38 } as const);
