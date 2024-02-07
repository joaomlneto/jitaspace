import { memo } from "react";
import { Group, Text, UnstyledButton } from "@mantine/core";

import { useEsiCharacter } from "@jitaspace/hooks";
import { CharacterAvatar, CharacterOnlineIndicator } from "@jitaspace/ui";
import { ConditionalWrapper } from "@jitaspace/utils";

import classes from "./Button.module.css";


export type CharacterButtonProps = {
  characterId?: number;
  showOnlineIndicator?: boolean;
};

export const CharacterButton = memo(
  ({ characterId, showOnlineIndicator = false }: CharacterButtonProps) => {
    const { data } = useEsiCharacter(
      characterId ?? 0,
      {},
      {},
      { query: { enabled: characterId !== undefined } },
    );
    return (
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
    );
  },
);

CharacterButton.displayName = "CharacterButton";
