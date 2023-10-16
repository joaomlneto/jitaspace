import { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useEsiName, type ResolvableEntityCategory } from "@jitaspace/hooks";

export type EveEntityNameProps = TextProps & {
  entityId?: string | number;
  category?: ResolvableEntityCategory;
};

export const EveEntityName = memo(
  ({ entityId, category, ...otherProps }: EveEntityNameProps) => {
    const { name, loading } = useEsiName(entityId, category);

    if (!entityId || loading) {
      return (
        <Skeleton>
          <Text {...otherProps}>{name ?? "Unknown"}</Text>
        </Skeleton>
      );
    }

    // Resolve wtf this is in the worst possible way - via a POST request!?
    return <Text {...otherProps}>{name ?? "Unknown"}</Text>;
  },
);
EveEntityName.displayName = "EveEntityName";
