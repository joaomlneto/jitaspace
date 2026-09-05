"use client";

import type { ColorSwatchProps } from "@mantine/core";
import { memo } from "react";
import { ColorSwatch } from "@mantine/core";

export type MailLabelColorSwatchProps = Omit<ColorSwatchProps, "color"> & {
  color?: string;
};

export const MailLabelColorSwatch = memo(
  ({ color, ...otherProps }: MailLabelColorSwatchProps) => {
    // Not a bare "primary": that is neither a CSS colour keyword nor a
    // Mantine theme key, so the declaration was dropped and the swatch
    // rendered with no colour at all.
    return (
      <ColorSwatch
        color={color ?? "var(--mantine-primary-color-filled)"}
        {...otherProps}
      />
    );
  },
);
MailLabelColorSwatch.displayName = "MailLabelColorSwatch";
