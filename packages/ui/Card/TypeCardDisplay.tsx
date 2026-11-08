"use client";

import type { CardProps } from "@mantine/core";
import type { ReactNode } from "react";
import { memo } from "react";
import { Badge, Group, Text } from "@mantine/core";

import type { EntityCardVariant, EntityRef } from "./types";
import { TypeAvatar } from "../Avatar";
import { ISKAmount } from "../Text";
import { EntityCard, EntityCardSection } from "./EntityCard";
import {
  entityCardAvatarProps,
  EntityCardTitle,
  EntityLink,
} from "./EntityLink";

export interface TypeCardData {
  name?: string;
  group?: EntityRef;
  category?: EntityRef;
  /** Packaged volume where it differs, else volume, in m³. */
  volume?: number;
  /** In kg. */
  mass?: number;
  /** Cargo capacity in m³. */
  capacity?: number;
  /** An estimated price in ISK, e.g. ESI's average market price. */
  price?: number;
  /** Plain text; strip the EVE markup first. */
  description?: string;
  /** Not on the market and not obtainable in game. */
  unpublished?: boolean;
}

export interface TypeCardDisplayProps {
  typeId: number;
  /** Omit while loading. */
  type?: TypeCardData;
  variant?: EntityCardVariant;
  /** The image server's `render` (ships, structures) rather than the icon. */
  imageVariation?: "icon" | "render";
  headerRightSection?: ReactNode;
  /** Passed to the card frame, e.g. `withBorder={false}` to embed it. */
  cardProps?: Omit<CardProps, "children">;
}

const quantity = (value: number | undefined, unit: string) =>
  value === undefined
    ? undefined
    : `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${unit}`;

/** An item type: where it sits in the inventory, its size, and its price. */
export const TypeCardDisplay = memo(
  ({
    typeId,
    type,
    variant = "full",
    imageVariation = "icon",
    headerRightSection,
    cardProps,
  }: TypeCardDisplayProps) => {
    return (
      <EntityCard
        {...cardProps}
        variant={variant}
        loading={!type}
        avatar={
          <TypeAvatar
            typeId={typeId}
            variation={imageVariation}
            {...entityCardAvatarProps(variant)}
          />
        }
        title={
          <EntityCardTitle
            kind="type"
            entity={{ id: typeId, name: type?.name }}
            variant={variant}
          />
        }
        badges={
          type?.unpublished && (
            <Badge color="gray" variant="light">
              Unpublished
            </Badge>
          )
        }
        subtitle={
          (type?.category ?? type?.group) && (
            <Group gap={6} wrap="nowrap" miw={0}>
              <EntityLink
                kind="category"
                entity={type.category}
                withAvatar={false}
                c="dimmed"
              />
              {type.category && type.group && (
                <Text size="xs" c="dimmed">
                  ›
                </Text>
              )}
              <EntityLink
                kind="group"
                entity={type.group}
                withAvatar={false}
                c="dimmed"
              />
            </Group>
          )
        }
        headerRightSection={headerRightSection}
        stats={[
          {
            label: "Estimated price",
            value: type?.price !== undefined && (
              <ISKAmount amount={type.price} size="xs" />
            ),
          },
          { label: "Volume", value: quantity(type?.volume, "m³") },
          { label: "Mass", value: quantity(type?.mass, "kg") },
          { label: "Capacity", value: quantity(type?.capacity, "m³") },
        ]}
      >
        {type?.description && (
          <EntityCardSection>
            <Text size="xs" c="dimmed" lineClamp={4}>
              {type.description}
            </Text>
          </EntityCardSection>
        )}
      </EntityCard>
    );
  },
);
TypeCardDisplay.displayName = "TypeCardDisplay";
