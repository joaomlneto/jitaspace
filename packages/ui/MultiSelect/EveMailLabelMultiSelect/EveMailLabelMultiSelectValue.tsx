import React, { memo } from "react";
import {
  Box,
  CloseButton,
  rem,
  useMantineColorScheme,
  useMantineTheme,
  type MultiSelectValueProps,
} from "@mantine/core";

import { MailLabelColorSwatch } from "../../ColorSwatch";
import { LabelName } from "../../Text";

export const EmailLabelMultiSelectValue = (characterId: number) =>
  memo(
    ({
      value,
      onRemove,
      ...others
    }: Omit<MultiSelectValueProps, "value"> & {
      value: string | number;
    }) => {
      const theme = useMantineTheme();
      const { colorScheme } = useMantineColorScheme();
      return (
        <div {...others}>
          <Box
            style={(theme) => ({
              display: "flex",
              cursor: "default",
              alignItems: "center",
              backgroundColor:
                colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
              border: `${rem(1)} solid ${
                colorScheme === "dark"
                  ? theme.colors.dark[7]
                  : theme.colors.gray[4]
              }`,
              paddingLeft: theme.spacing.xs,
              borderRadius: theme.radius.sm,
            })}
          >
            <MailLabelColorSwatch
              characterId={characterId}
              labelId={value ?? 1}
              size={16}
              mr={10}
            />
            <LabelName
              characterId={characterId}
              style={{ lineHeight: 1, fontSize: rem(12) }}
              labelId={value}
            />

            <CloseButton
              onMouseDown={onRemove}
              variant="transparent"
              size={22}
              iconSize={14}
              tabIndex={-1}
            />
          </Box>
        </div>
      );
    },
  );
EmailLabelMultiSelectValue.displayName = "EmailLabelMultiSelectValue";
