import { memo } from "react";
import { ColorSwatch, Group, Tooltip } from "@mantine/core";

export interface CorporationPaletteSwatchesProps {
  colors: readonly string[];
  size?: number;
}

const LABELS = ["Main", "Secondary", "Tertiary"];

/** The corporation's colours as swatches, each naming its hex value on hover. */
export const CorporationPaletteSwatches = memo(
  ({ colors, size = 20 }: CorporationPaletteSwatchesProps) => (
    <Group gap={6}>
      {colors.map((color, index) => (
        <Tooltip
          key={index}
          label={`${LABELS[index] ?? "Colour"} ${color.toLowerCase()}`}
        >
          <ColorSwatch
            color={color}
            size={size}
            aria-label={`${LABELS[index] ?? "Colour"} colour ${color.toLowerCase()}`}
          />
        </Tooltip>
      ))}
    </Group>
  ),
);
CorporationPaletteSwatches.displayName = "CorporationPaletteSwatches";
