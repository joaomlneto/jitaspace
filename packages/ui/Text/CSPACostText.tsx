import { memo, useEffect, useState } from "react";
import { Text, type TextProps } from "@mantine/core";
import { useSession } from "next-auth/react";

import { postCharactersCharacterIdCspa } from "@jitaspace/esi-client";
import { toArrayIfNot } from "@jitaspace/utils";

export type CSPACostTextProps = TextProps & {
  characterIds?: number | number[];
};
export const CSPACostText = memo(
  ({ characterIds, ...otherProps }: CSPACostTextProps) => {
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
  },
);
CSPACostText.displayName = "CSPACostText";
