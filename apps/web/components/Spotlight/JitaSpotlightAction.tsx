import React from "react";
import {
  Center,
  Group,
  rem,
  Text,
  UnstyledButton,
  UnstyledButtonProps,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { type SpotlightActionProps } from "@mantine/spotlight";

import { type GetCharactersCharacterIdSearch200 } from "@jitaspace/esi-client";
import { EveEntityAvatar, EveEntityName } from "@jitaspace/ui";

type JitaSpotlightActionProps = Omit<UnstyledButtonProps, "children"> & {
  action: SpotlightActionProps["children"] & {
    type: "app" | "eve-entity";
    category?: keyof GetCharactersCharacterIdSearch200;
    title?: string;
    description?: string;
    entityId: number;
    icon?: React.ReactElement;
  };
};

export const JitaSpotlightAction = ({
  action,
  styles,
  ...others
}: JitaSpotlightActionProps) => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  /*
  const { classes } = useStyles(undefined, {
    styles,
    classNames,
    name: "Spotlight",
  });*/

  /**
   * FIXME MANTINE V7 MIGRATION
   * THIS FILE TO BE COMPLETELY RE-CHECKED AFTERWARDS!!! :(
   */

  // is this an EVE entity?
  if (action.type === "eve-entity")
    return (
      <UnstyledButton
        style={{
          position: "relative",
          display: "block",
          width: "100%",
          padding: `${rem(10)} ${rem(12)}`,
          borderRadius: theme.radius.sm,
          /*
          ...theme.hover.hover({
            backgroundColor:
              colorScheme === "dark"
                ? theme.colors.dark[4]
                : theme.colors.gray[1],
          }),
          "&[data-hovered]": {
            backgroundColor:
              colorScheme === "dark"
                ? theme.colors.dark[4]
                : theme.colors.gray[1],
          },*/
        }}
        //data-hovered={hovered || undefined}
        tabIndex={-1}
        onMouseDown={(event) => event.preventDefault()}
        //onClick={onTrigger}
        {...others}
      >
        <Group wrap="nowrap">
          {action.category &&
            [
              "agent",
              "character",
              "corporation",
              "alliance",
              "inventory_type",
              "solar_system",
              "station",
              "structure",
            ].includes(action.category) && (
              <Center>
                <EveEntityAvatar radius="xl" entityId={action.entityId} />
              </Center>
            )}

          <div style={{ flex: 1 }}>
            <EveEntityName entityId={action.entityId} />

            {action.description && (
              <Text color="dimmed" size="xs">
                {action.description}
              </Text>
            )}
          </div>
        </Group>
      </UnstyledButton>
    );

  // otherwise it is an app!
  return (
    <UnstyledButton
      style={{
        position: "relative",
        display: "block",
        width: "100%",
        padding: `${rem(10)} ${rem(12)}`,
        borderRadius: theme.radius.sm,
        /*
        ...theme.fn.hover({
          backgroundColor:
            colorScheme === "dark"
              ? theme.colors.dark[4]
              : theme.colors.gray[1],
        }),

        "&[data-hovered]": {
          backgroundColor:
            theme.colorScheme === "dark"
              ? theme.colors.dark[4]
              : theme.colors.gray[1],
        },*/
      }}
      //data-hovered={hovered || undefined}
      tabIndex={-1}
      onMouseDown={(event) => event.preventDefault()}
      //onClick={onTrigger}
      {...others}
    >
      <Group wrap="nowrap">
        <Center>{action.icon}</Center>

        <div style={{ flex: 1 }}>
          <Text>{action.title}</Text>

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
