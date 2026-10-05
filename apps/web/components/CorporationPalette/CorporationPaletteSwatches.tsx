import { memo } from "react";
import { ColorSwatch, Group, Tooltip } from "@mantine/core";

import type { CorporationPaletteSlot } from "./corporationPalette";

export interface CorporationPaletteSwatchesProps {
  slots: readonly CorporationPaletteSlot[];
  size?: number;
}

/** The corporation's colours as swatches, each naming its hex value on hover. */
export const CorporationPaletteSwatches = memo(
  ({ slots, size = 20 }: CorporationPaletteSwatchesProps) => (
    <Group gap={6}>
      {slots.map(({ role, color }) => (
        <Tooltip key={role} label={`${role} ${color.toLowerCase()}`}>
          <ColorSwatch
            color={color}
            size={size}
            aria-label={`${role} colour ${color.toLowerCase()}`}
          />
        </Tooltip>
      ))}
    </Group>
  ),
);
CorporationPaletteSwatches.displayName = "CorporationPaletteSwatches";
