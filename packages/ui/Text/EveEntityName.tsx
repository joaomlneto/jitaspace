import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useEsiName, type ResolvableEntityCategory } from "../hooks";

export type EveEntityNameProps = TextProps & {
  entityId: string | number;
  category?: ResolvableEntityCategory;
};

export const EveEntityName = ({
  entityId,
  category,
  ...otherProps
}: EveEntityNameProps) => {
  const { name, loading, error } = useEsiName(entityId, category);

  // Resolve wtf this is in the worst possible way - via a POST request!
  return (
    <Skeleton visible={loading}>
      <Text {...otherProps}>{name ?? "Unknown"}</Text>
    </Skeleton>
  );
};
