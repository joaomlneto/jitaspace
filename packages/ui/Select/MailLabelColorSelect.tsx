import { memo, useState } from "react";
import { ActionIcon, ColorInput, type ColorInputProps } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";

import { postCharactersCharacterIdMailLabelsMutationRequestColor } from "@jitaspace/esi-client";
import { getRandomArrayEntry } from "@jitaspace/utils";

export const MailLabelColorSelect = memo(
  ({ ...otherProps }: ColorInputProps) => {
    const colors = Object.keys(
      postCharactersCharacterIdMailLabelsMutationRequestColor,
    );
    const getRandomColor = () => getRandomArrayEntry(colors);
    const [value, onChange] = useState(otherProps.value ?? getRandomColor());

    return (
      <ColorInput
        disallowInput
        withPicker={false}
        swatchesPerRow={6}
        swatches={Object.keys(
          postCharactersCharacterIdMailLabelsMutationRequestColor,
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
