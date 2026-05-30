"use client";

import type { ColorSwatchProps } from "@mantine/core";
import { memo } from "react";
import { ColorSwatch } from "@mantine/core";

export type MailLabelColorSwatchProps = Omit<ColorSwatchProps, "color"> & {
  color?: string;
};

export const MailLabelColorSwatch = memo(
  ({ color, ...otherProps }: MailLabelColorSwatchProps) => {
    return <ColorSwatch color={color ?? "primary"} {...otherProps} />;
  },
);
MailLabelColorSwatch.displayName = "MailLabelColorSwatch";
