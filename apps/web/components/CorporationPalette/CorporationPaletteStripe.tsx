import type { BoxProps } from "@mantine/core";
import { memo } from "react";
import { Box } from "@mantine/core";

export type CorporationPaletteStripeProps = BoxProps & {
  colors: readonly string[];
  height?: number;
};

/** A thin flag of the corporation's colours, one equal band per colour. */
export const CorporationPaletteStripe = memo(
  ({ colors, height = 5, ...otherProps }: CorporationPaletteStripeProps) => {
    if (colors.length === 0) return null;
    return (
      <Box
        display="flex"
        h={height}
        aria-hidden
        data-testid="corporation-palette-stripe"
        {...otherProps}
      >
        {colors.map((color, index) => (
          <Box key={index} flex={1} bg={color} />
        ))}
      </Box>
    );
  },
);
CorporationPaletteStripe.displayName = "CorporationPaletteStripe";
