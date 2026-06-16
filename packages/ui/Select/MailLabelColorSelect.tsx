"use client";

import type { ColorInputProps } from "@mantine/core";
import { memo, useState } from "react";
import { ActionIcon, ColorInput } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";

import { getRandomArrayEntry } from "@jitaspace/utils";

const mailLabelColors = {
  "#0000fe": "#0000fe",
  "#006634": "#006634",
  "#0099ff": "#0099ff",
  "#00ff33": "#00ff33",
  "#01ffff": "#01ffff",
  "#349800": "#349800",
  "#660066": "#660066",
  "#666666": "#666666",
  "#999999": "#999999",
  "#99ffff": "#99ffff",
  "#9a0000": "#9a0000",
  "#ccff9a": "#ccff9a",
  "#e6e6e6": "#e6e6e6",
  "#fe0000": "#fe0000",
  "#ff6600": "#ff6600",
  "#ffff01": "#ffff01",
  "#ffffcd": "#ffffcd",
  "#ffffff": "#ffffff",
} as const;

export const MailLabelColorSelect = memo(
  ({ ...otherProps }: ColorInputProps) => {
    const colors = Object.keys(mailLabelColors);
    const getRandomColor = () => getRandomArrayEntry(colors);
    const [value, setValue] = useState(otherProps.value ?? getRandomColor());

    return (
      <ColorInput
        {...otherProps}
        disallowInput
        withPicker={false}
        swatchesPerRow={6}
        swatches={colors}
        rightSection={
          <ActionIcon
            onClick={() => {
              const color = getRandomColor();
              otherProps.onChange?.(color);
              setValue(color);
            }}
          >
            <IconRefresh size="1rem" />
          </ActionIcon>
        }
        value={otherProps.value ?? value}
        onChange={(color: string) => {
          otherProps.onChange?.(color);
          setValue(color);
        }}
        w={140}
      />
    );
  },
);
MailLabelColorSelect.displayName = "MailLabelColorSelect";
