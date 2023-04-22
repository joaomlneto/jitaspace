import { Text, type TextProps } from "@mantine/core";

import { useGetCharactersCharacterId } from "@jitaspace/esi-client";

type Props = TextProps & {
  characterId?: number;
};
export default function CharacterNameText({
  characterId,
  ...otherProps
}: Props) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { data, error } = useGetCharactersCharacterId(characterId!, undefined, {
    swr: { enabled: characterId !== undefined },
  });

  const characterDeleted =
    (error?.response?.data as { error?: unknown }).error ==
    "Character has been deleted!";

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
}
