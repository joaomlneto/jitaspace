import React from "react";
import {
  Center,
  createStyles,
  Group,
  rem,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { type SpotlightActionProps } from "@mantine/spotlight";

import { EveEntityAvatar, EveEntityName } from "@jitaspace/ui";

const useStyles = createStyles((theme) => ({
  action: {
    position: "relative",
    display: "block",
    width: "100%",
    padding: `${rem(10)} ${rem(12)}`,
    borderRadius: theme.radius.sm,
    ...theme.fn.hover({
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[4]
          : theme.colors.gray[1],
    }),

    "&[data-hovered]": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[4]
          : theme.colors.gray[1],
    },
  },
}));

type JitaSpotlightActionProps = Omit<SpotlightActionProps, "action"> & {
  action: SpotlightActionProps["action"] & {
    entityId: number;
  };
};

export const JitaSpotlightAction = ({
  action,
  styles,
  classNames,
  hovered,
  onTrigger,
  ...others
}: JitaSpotlightActionProps) => {
  const { classes } = useStyles(undefined, {
    styles,
    classNames,
    name: "Spotlight",
  });

  return (
    <UnstyledButton
      className={classes.action}
      data-hovered={hovered || undefined}
      tabIndex={-1}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onTrigger}
      {...others}
    >
      <Group noWrap>
        {action.entityId && (
          <Center>
            <EveEntityAvatar radius="xl" entityId={action.entityId} />
          </Center>
        )}

        <div style={{ flex: 1 }}>
          <EveEntityName entityId={action.entityId}>
            {action.title}
          </EveEntityName>

          {action.description && (
            <Text color="dimmed" size="xs">
              {action.description}
            </Text>
          )}
        </div>
      </Group>
    </UnstyledButton>
  );
};
