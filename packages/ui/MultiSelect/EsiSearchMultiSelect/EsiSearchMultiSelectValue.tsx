import React, { memo } from "react";
import {
  Box,
  CloseButton,
  rem,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";

import { EveEntityAvatar } from "../../Avatar";
import { EveEntityName } from "../../Text";

export const EsiSearchMultiSelectValue = memo(
  ({
    value,
    //onRemove,
    ...others
  }: {
    value: string;
    category: string;
  }) => {
    const theme = useMantineTheme();
    const { colorScheme } = useMantineColorScheme();
    return (
      <div {...others}>
        <Box
          style={{
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
          }}
        >
          <EveEntityAvatar entityId={value} size={16} mr={10} radius="xl" />
          <EveEntityName
            entityId={value}
            style={{ lineHeight: 1, fontSize: rem(12) }}
          />
          {/* FIXME MANTINE V7 MIGRATION */}
          <CloseButton
            //onMouseDown={onRemove}
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
EsiSearchMultiSelectValue.displayName = "EsiSearchMultiSelectValue";
