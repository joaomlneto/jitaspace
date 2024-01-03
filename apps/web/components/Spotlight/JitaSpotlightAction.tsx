import React from "react";
import { UnstyledButton } from "@mantine/core";
import { SpotlightActionProps, SpotlightProps } from "@mantine/spotlight";

import { EsiSearchCategory } from "@jitaspace/hooks";





type JitaSpotlightActionProps = Omit<SpotlightProps, "actions"> & {
  action: SpotlightActionProps & {
    type: "app" | "eve-entity";
    category?: EsiSearchCategory;
    entityId: number;
  };
};

export const JitaSpotlightAction = ({
  action,
  styles,
  classNames,
  //hovered,
  //onTrigger,
  ...others
}: JitaSpotlightActionProps) => {
  /*
  // is this an EVE entity?
  if (action.type === "eve-entity")
    return (
      <UnstyledButton
        className={classes.action}
        data-hovered={hovered || undefined}
        tabIndex={-1}
        //onMouseDown={(event) => event.preventDefault()}
        onClick={onTrigger}
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
      className={classes.action}
      data-hovered={hovered || undefined}
      tabIndex={-1}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onTrigger}
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
  );*/
  return <UnstyledButton />;
};
