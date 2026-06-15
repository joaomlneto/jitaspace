"use client";

import { memo } from "react";
import { type TextProps } from "@mantine/core";

import type { ResolvableEntityCategory } from "@jitaspace/hooks";
import { useEsiName } from "@jitaspace/hooks";
import { EveEntityNameDisplay } from "@jitaspace/ui";

export type EveEntityNameProps = TextProps & {
  entityId?: string | number | null;
  category?: ResolvableEntityCategory;
};

export const EveEntityName = memo(
  ({ entityId, category, ...otherProps }: EveEntityNameProps) => {
    const { name, loading } = useEsiName(entityId ?? undefined, category);

    return (
      <EveEntityNameDisplay
        name={name}
        loading={loading || !entityId}
        {...otherProps}
      />
    );
  },
);
EveEntityName.displayName = "EveEntityName";
