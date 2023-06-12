import React from "react";
import {
  Box,
  CloseButton,
  rem,
  type MultiSelectValueProps,
} from "@mantine/core";

import { MailLabelColorSwatch } from "../../ColorSwatch";
import { LabelName } from "../../Text";

export function EmailLabelMultiSelectValue({
  value,
  onRemove,
  ...others
}: Omit<MultiSelectValueProps, "value"> & {
  value: string | number;
}) {
  return (
    <div {...others}>
      <Box
        sx={(theme) => ({
          display: "flex",
          cursor: "default",
          alignItems: "center",
          backgroundColor:
            theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
          border: `${rem(1)} solid ${
            theme.colorScheme === "dark"
              ? theme.colors.dark[7]
              : theme.colors.gray[4]
          }`,
          paddingLeft: theme.spacing.xs,
          borderRadius: theme.radius.sm,
        })}
      >
        <MailLabelColorSwatch labelId={value ?? 1} size={16} mr={10} />
        <LabelName sx={{ lineHeight: 1, fontSize: rem(12) }} labelId={value} />

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
}
