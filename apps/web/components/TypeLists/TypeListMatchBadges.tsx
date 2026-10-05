import { Badge, Group } from "@mantine/core";

import type { TypeListRefType } from "~/lib/typeLists";
import { TYPE_LIST_REF_TYPE_LABELS } from "~/lib/typeLists";

const COLORS: Record<TypeListRefType, string> = {
  category: "grape",
  group: "blue",
  type: "teal",
};

/** One badge per rule kind that matched — "Category", "Group", "Type". */
export function TypeListMatchBadges({
  refTypes,
  color,
}: Readonly<{
  refTypes: readonly TypeListRefType[];
  /** Overrides the per-kind colours, e.g. red for exclusions. */
  color?: string;
}>) {
  return (
    <Group gap={4} wrap="nowrap">
      {refTypes.map((refType) => (
        <Badge
          key={refType}
          size="sm"
          variant="light"
          color={color ?? COLORS[refType]}
        >
          {TYPE_LIST_REF_TYPE_LABELS[refType]}
        </Badge>
      ))}
    </Group>
  );
}
