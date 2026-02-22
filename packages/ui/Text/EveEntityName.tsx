"use client";

import { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useEsiName, type ResolvableEntityCategory } from "@jitaspace/hooks";





export type EveEntityNameProps = TextProps & {
  entityId?: string | number | null;
  category?: ResolvableEntityCategory;
};

export const EveEntityName = memo(
  ({ entityId, category, ...otherProps }: EveEntityNameProps) => {
    const { name, loading } = useEsiName(entityId ?? undefined, category);

    if (!entityId || loading) {
      const placeholder = name ?? "Unknown";
      const skeletonWidth = Math.min(Math.max(placeholder.length, 4), 24);
      return (
        <Text {...otherProps}>
          <Skeleton
            component="span"
            style={{ display: "inline-block" }}
            height="1em"
            width={`${skeletonWidth}ch`}
          />
        </Text>
      );
    }

    // Resolve wtf this is in the worst possible way - via a POST request!?
    return <Text {...otherProps}>{name ?? "Unknown"}</Text>;
  },
);
EveEntityName.displayName = "EveEntityName";
