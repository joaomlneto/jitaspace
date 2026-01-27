import _React, { memo } from "react";
import { Group, Popover, Text, UnstyledButton } from "@mantine/core";

import { useEsiCharacter } from "@jitaspace/hooks";
import {
  CharacterAvatar,
  CharacterCard,
  CharacterOnlineIndicator,
} from "@jitaspace/ui";
import { ConditionalWrapper } from "@jitaspace/utils";

import classes from "./Button.module.css";


export interface CharacterButtonProps {
  characterId?: number;
  showOnlineIndicator?: boolean;
  withHoverCard?: boolean;
}

export const CharacterButton = memo(
  ({
    characterId,
    showOnlineIndicator = false,
    withHoverCard: _withHoverCard = true,
  }: CharacterButtonProps) => {
    const { data } = useEsiCharacter(
      characterId ?? 0,
      {},
      {},
      { query: { enabled: characterId !== undefined } },
    );
    return (
      <Popover>
        <Popover.Target>
          <UnstyledButton className={classes.user}>
            <Group wrap="nowrap" gap="sm">
              <ConditionalWrapper
                condition={showOnlineIndicator && characterId !== undefined}
                wrapper={(children) => (
                  <CharacterOnlineIndicator characterId={characterId!}>
                    {children}
                  </CharacterOnlineIndicator>
                )}
              >
                <CharacterAvatar characterId={characterId} size={30} />
              </ConditionalWrapper>
              <Text fz="sm" fw={500} inherit={true}>
                {data?.data.name}
              </Text>
            </Group>
          </UnstyledButton>
        </Popover.Target>
        <Popover.Dropdown>
          {characterId && <CharacterCard characterId={characterId} />}
        </Popover.Dropdown>
      </Popover>
    );
  },
);

CharacterButton.displayName = "CharacterButton";
