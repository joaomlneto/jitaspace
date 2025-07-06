"use client";

import type { ColorInputProps } from "@mantine/core";
import React, { memo, useState } from "react";
import { ActionIcon, ColorInput } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";

import { postCharactersCharacterIdMailLabelsMutationRequestColorEnum } from "@jitaspace/esi-client";
import { getRandomArrayEntry } from "@jitaspace/utils";

export const MailLabelColorSelect = memo(
  ({ ...otherProps }: ColorInputProps) => {
    const colors = Object.keys(
      postCharactersCharacterIdMailLabelsMutationRequestColorEnum,
    );
    const getRandomColor = () => getRandomArrayEntry(colors);
    const [value, onChange] = useState(otherProps.value ?? getRandomColor());

    return (
      <ColorInput
        disallowInput
        withPicker={false}
        swatchesPerRow={6}
        swatches={Object.keys(
          postCharactersCharacterIdMailLabelsMutationRequestColorEnum,
        )}
        rightSection={
          <ActionIcon
            onClick={() => {
              const color = getRandomColor();
              otherProps.onChange?.(color);
              onChange(color);
            }}
          >
            <IconRefresh size="1rem" />
          </ActionIcon>
        }
        value={otherProps.value ?? value}
        onChange={(color: string) => {
          otherProps.onChange?.(color);
          onChange(color);
        }}
        w={140}
        {...otherProps}
      />
    );
  },
);
MailLabelColorSelect.displayName = "MailLabelColorSelect";
