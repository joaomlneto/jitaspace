import React, { memo } from "react";
import Link from "next/link";
import {
  createStyles,
  Group,
  Text,
  UnstyledButton,
  type UnstyledButtonProps,
} from "@mantine/core";

import { CharacterAvatar } from "../Avatar";
import { CharacterName } from "../Text";

const useStyles = createStyles((theme) => ({
  user: {
    display: "block",
    width: "100%",
    padding: theme.spacing.md,
    color: theme.colorScheme === "dark" ? theme.colors.dark[0] : theme.black,

    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[8]
          : theme.colors.gray[0],
    },
  },
}));

export type CharacterButtonProps = UnstyledButtonProps & {
  characterId?: string | number;
  description?: React.ReactNode;
  icon?: React.ReactNode;
};
export const CharacterButton = memo(
  ({ characterId, description, icon, ...otherProps }: CharacterButtonProps) => {
    const { classes } = useStyles();
    return (
      <UnstyledButton
        component={Link}
        href={`/character/${characterId}`}
        className={classes.user}
        {...otherProps}
      >
        <Group>
          <CharacterAvatar characterId={characterId} />

          <div style={{ flex: 1 }}>
            <CharacterName characterId={characterId} size="sm" weight={500} />

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
