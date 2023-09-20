import React, { memo } from "react";
import Link from "next/link";
import {
  Group,
  Text,
  UnstyledButton,
  useMantineColorScheme,
  useMantineTheme,
  type UnstyledButtonProps,
} from "@mantine/core";

import { CharacterAvatar } from "../Avatar";
import { CharacterName } from "../Text";

export type CharacterButtonProps = UnstyledButtonProps & {
  characterId?: string | number;
  description?: React.ReactNode;
  icon?: React.ReactNode;
};
export const CharacterButton = memo(
  ({ characterId, description, icon, ...otherProps }: CharacterButtonProps) => {
    const theme = useMantineTheme();
    const { colorScheme } = useMantineColorScheme();
    const classes = {
      user: {
        display: "block",
        width: "100%",
        padding: theme.spacing.md,
        color: colorScheme === "dark" ? theme.colors.dark[0] : theme.black,

        "&:hover": {
          backgroundColor:
            colorScheme === "dark"
              ? theme.colors.dark[8]
              : theme.colors.gray[0],
        },
      },
    };
    return (
      <UnstyledButton
        component={Link}
        href={`/character/${characterId}`}
        style={classes.user}
        {...otherProps}
      >
        <Group>
          <CharacterAvatar characterId={characterId} />

          <div style={{ flex: 1 }}>
            <CharacterName characterId={characterId} size="sm" fw={500} />

            <Text color="dimmed" size="xs">
              {description}
            </Text>
          </div>

          {icon}
        </Group>
      </UnstyledButton>
    );
  },
);

CharacterButton.displayName = "CharacterButton";
