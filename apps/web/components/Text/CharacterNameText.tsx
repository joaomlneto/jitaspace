import { Text, type TextProps } from "@mantine/core";

import { useGetCharactersCharacterId } from "@jitaspace/esi-client";

type Props = TextProps & {
  characterId: string | number;
};
export default function CharacterNameText({
  characterId,
  ...otherProps
}: Props) {
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
}
