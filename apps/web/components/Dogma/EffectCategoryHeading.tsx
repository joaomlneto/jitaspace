import { Text, Tooltip } from "@mantine/core";

import type { EffectCategory } from "~/lib/dogmaEffectCategory";
import { effectCategoryLabel } from "~/lib/dogmaEffectCategory";

/**
 * The heading over one group of effects that share a category, styled like the
 * type page's attribute category headings. Hovering it shows our description
 * of when those effects apply; a null category is the "Other" group.
 */
export function EffectCategoryHeading({
  category,
}: Readonly<{ category: EffectCategory | null }>) {
  const description = category?.customDescription ?? null;
  return (
    <Tooltip
      label={description}
      disabled={!description}
      multiline
      w={320}
      withArrow
      position="top-start"
    >
      <Text
        fw={700}
        size="sm"
        c="bright"
        tt="uppercase"
        w="fit-content"
        style={{
          letterSpacing: "0.04em",
          cursor: description ? "help" : undefined,
        }}
      >
        {category ? effectCategoryLabel(category) : "Other"}
      </Text>
    </Tooltip>
  );
}
