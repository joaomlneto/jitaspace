import type { BoxProps } from "@mantine/core";
import { memo } from "react";
import { Box } from "@mantine/core";

import type { CorporationPaletteSlot } from "./corporationPalette";

export type CorporationPaletteStripeProps = BoxProps & {
  slots: readonly CorporationPaletteSlot[];
  height?: number;
};

/** A thin flag of the corporation's colours, one equal band per colour. */
export const CorporationPaletteStripe = memo(
  ({ slots, height = 5, ...otherProps }: CorporationPaletteStripeProps) => {
    if (slots.length === 0) return null;
    return (
      <Box
        display="flex"
        h={height}
        aria-hidden
        data-testid="corporation-palette-stripe"
        {...otherProps}
      >
        {slots.map(({ role, color }) => (
          <Box key={role} flex={1} bg={color} />
        ))}
      </Box>
    );
  },
);
CorporationPaletteStripe.displayName = "CorporationPaletteStripe";
