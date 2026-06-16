"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";
import { Skeleton, Text } from "@mantine/core";

export type EveEntityNameDisplayProps = TextProps & {
  /** The already-resolved entity name (or null/undefined while unresolved). */
  name?: string | null;
  /** When true, render a skeleton placeholder instead of the name. */
  loading?: boolean;
};

/**
 * Pure, hook-free renderer for an EVE entity name. The data-fetching twin that
 * resolves an entity id into a name lives in `@jitaspace/eve-components`
 * (`EveEntityName`); this component only renders already-resolved data so it can
 * stay in the dependency-light `@jitaspace/ui` package.
 */
export const EveEntityNameDisplay = memo(
  ({ name, loading, ...otherProps }: EveEntityNameDisplayProps) => {
    if (loading) {
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

    return <Text {...otherProps}>{name ?? "Unknown"}</Text>;
  },
);
EveEntityNameDisplay.displayName = "EveEntityNameDisplay";
