import { memo } from "react";
import { Text, type TextProps } from "@mantine/core";

import { useGetCharactersCharacterId } from "@jitaspace/esi-client";

export type CharacterNameProps = TextProps & {
  characterId: string | number;
};

export const CharacterName = memo(
  ({ characterId, ...otherProps }: CharacterNameProps) => {
    const { data, error } = useGetCharactersCharacterId(
      typeof characterId === "string" ? parseInt(characterId, 10) : characterId,
      undefined,
      {
        swr: { enabled: characterId !== undefined },
      },
    );

    console.log({ data, error });

    const characterDeleted =
      error?.response?.data?.error == "Character has been deleted!";

    return (
      <Text {...otherProps}>
        {data && data.data.name}
        {error && characterDeleted && (
          <Text span color="dimmed">
            Deleted Character
          </Text>
        )}
      </Text>
    );
  },
);
CharacterName.displayName = "CharacterName";
