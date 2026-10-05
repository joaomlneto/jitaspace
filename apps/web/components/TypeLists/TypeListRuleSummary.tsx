import { Text } from "@mantine/core";

import type { TypeListRefType } from "~/lib/typeLists";
import { TYPE_LIST_REF_TYPES } from "~/lib/typeLists";

const PLURALS: Record<TypeListRefType, [string, string]> = {
  category: ["category", "categories"],
  group: ["group", "groups"],
  type: ["type", "types"],
};

/** "2 categories · 4 groups · 6 types", or a dimmed dash for no rules. */
export function TypeListRuleSummary({
  counts,
}: Readonly<{ counts: Record<TypeListRefType, number> }>) {
  const parts = TYPE_LIST_REF_TYPES.flatMap((refType) => {
    const count = counts[refType];
    if (count === 0) return [];
    const [singular, plural] = PLURALS[refType];
    return [`${count} ${count === 1 ? singular : plural}`];
  });
  if (parts.length === 0) {
    return (
      <Text span size="sm" c="dimmed">
        —
      </Text>
    );
  }
  return (
    <Text span size="sm">
      {parts.join(" · ")}
    </Text>
  );
}
