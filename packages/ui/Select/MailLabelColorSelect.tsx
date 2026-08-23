"use client";

import type { ColorInputProps } from "@mantine/core";
import { memo, useEffect, useRef, useState } from "react";
import { ActionIcon, ColorInput } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";

import { getRandomArrayEntry } from "@jitaspace/utils";

/** The colours EVE Online offers for mail labels, in the client's own order. */
const DEFAULT_MAIL_LABEL_COLOR = "#0000fe";
const MAIL_LABEL_COLORS = [
  DEFAULT_MAIL_LABEL_COLOR,
  "#006634",
  "#0099ff",
  "#00ff33",
  "#01ffff",
  "#349800",
  "#660066",
  "#666666",
  "#999999",
  "#99ffff",
  "#9a0000",
  "#ccff9a",
  "#e6e6e6",
  "#fe0000",
  "#ff6600",
  "#ffff01",
  "#ffffcd",
  "#ffffff",
];

export const MailLabelColorSelect = memo(
  ({ ...otherProps }: ColorInputProps) => {
    // Deterministic on first render: picking the random seed here would make
    // the server and client markup disagree and break hydration. The seed is
    // applied on mount instead, in the effect below.
    const [value, setValue] = useState(DEFAULT_MAIL_LABEL_COLOR);
    const seeded = useRef(false);

    useEffect(() => {
      if (seeded.current) return;
      seeded.current = true;
      // A controlled caller supplies its own colour; don't override it.
      if (otherProps.value !== undefined) return;
      setValue(getRandomArrayEntry(MAIL_LABEL_COLORS));
    }, [otherProps.value]);

    return (
      <ColorInput
        {...otherProps}
        disallowInput
        withPicker={false}
        swatchesPerRow={6}
        swatches={MAIL_LABEL_COLORS}
        rightSection={
          <ActionIcon
            aria-label="Pick a random colour"
            onClick={() => {
              const color = getRandomArrayEntry(MAIL_LABEL_COLORS);
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
