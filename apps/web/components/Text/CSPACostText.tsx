import { useEffect, useState } from "react";
import { Text, type TextProps } from "@mantine/core";
import { useSession } from "next-auth/react";

import { toArrayIfNot } from "~/utils/types";
import { postCharactersCharacterIdCspa } from "~/esi/character";

type Props = TextProps & {
  characterIds?: number | number[];
};
export default function CharacterNameText({
  characterIds,
  ...otherProps
}: Props) {
  const { data: session } = useSession();
  const [cost, setCost] = useState<number | null>(null);

  const characterIdsArray = toArrayIfNot(characterIds ?? []);

  useEffect(() => {
    if (characterIdsArray.length == 0) {
      return;
    }

    void postCharactersCharacterIdCspa(
      session?.user.id ?? 1,
      characterIdsArray.map((characterId) => Number(characterId)),
    ).then((data) => {
      setCost(data.data);
    });
  }, [characterIdsArray, session?.user.id]);

  return <Text {...otherProps}>{cost} ISK</Text>;
}
