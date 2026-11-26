"use client";

import type { ReactNode } from "react";
import { memo } from "react";

import type { EntityCardVariant } from "@jitaspace/ui";
import {
  useCategory,
  useGroup,
  useMarketPrices,
  useType,
} from "@jitaspace/hooks";
import { TypeCardDisplay } from "@jitaspace/ui";

import { plainText } from "./useEntityRefs";

export interface TypeCardProps {
  typeId: number;
  variant?: EntityCardVariant;
  /** The image server's `render` (ships, structures) rather than the icon. */
  imageVariation?: "icon" | "render";
  headerRightSection?: ReactNode;
}

/** `TypeCardDisplay`, filled from ESI. */
export const TypeCard = memo(
  ({
    typeId,
    variant = "full",
    imageVariation,
    headerRightSection,
  }: TypeCardProps) => {
    const { data: typeData } = useType(typeId);
    const type = typeData?.data;
    const { data: groupData } = useGroup(type?.group_id);
    const group = groupData?.data;
    const { data: categoryData } = useCategory(group?.category_id);
    const category = categoryData?.data;
    const { data: prices } = useMarketPrices();
    const price = prices[typeId];

    return (
      <TypeCardDisplay
        typeId={typeId}
        variant={variant}
        imageVariation={imageVariation}
        headerRightSection={headerRightSection}
        type={
          type && {
            name: type.name,
            group: type.group_id
              ? { id: type.group_id, name: group?.name }
              : undefined,
            category: group
              ? { id: group.category_id, name: category?.name }
              : undefined,
            volume: type.packaged_volume ?? type.volume,
            mass: type.mass,
            // Most items hold nothing; 0 m³ there is noise, not information.
            capacity: type.capacity === 0 ? undefined : type.capacity,
            price: price?.average_price ?? price?.adjusted_price,
            description: plainText(type.description),
            unpublished: !type.published,
          }
        }
      />
    );
  },
);
TypeCard.displayName = "TypeCard";
