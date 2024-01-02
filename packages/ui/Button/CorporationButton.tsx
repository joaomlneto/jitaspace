import React, { memo } from "react";
import Link from "next/link";
import {
  createStyles,
  Group,
  Text,
  UnstyledButton,
  type UnstyledButtonProps,
} from "@mantine/core";

import { CorporationAvatar } from "../Avatar";
import { CorporationName } from "../Text";


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

export type CorporationButtonProps = UnstyledButtonProps & {
  corporationId?: string | number;
  description?: React.ReactNode;
  icon?: React.ReactNode;
};

export const CorporationButton = memo(
  ({
    corporationId,
    description,
    icon,
    ...otherProps
  }: CorporationButtonProps) => {
    const { classes } = useStyles();
    return (
      <UnstyledButton
        component={Link}
        href={`/corporation/${corporationId}`}
        className={classes.user}
        {...otherProps}
      >
        <Group wrap="nowrap">
          <CorporationAvatar
            corporationId={corporationId}
            radius="xl"
            size="sm"
          />

          <div style={{ flex: 1 }}>
            <CorporationName
              corporationId={corporationId}
              size="sm"
              weight={500}
            />

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

CorporationButton.displayName = "CorporationButton";
