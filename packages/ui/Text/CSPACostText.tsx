import { memo, useEffect, useState } from "react";
import { Text, type TextProps } from "@mantine/core";

import { postCharactersCharacterIdCspa } from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/hooks";
import { toArrayIfNot } from "@jitaspace/utils";

export type CSPACostTextProps = TextProps & {
  characterIds?: number | number[];
};
export const CSPACostText = memo(
  ({ characterIds, ...otherProps }: CSPACostTextProps) => {
    const { characterId } = useEsiClientContext();
    const [cost, setCost] = useState<number | null>(null);

    const characterIdsArray = toArrayIfNot(characterIds ?? []);

    useEffect(() => {
      if (characterIdsArray.length == 0) {
        return;
      }

      void postCharactersCharacterIdCspa(
        characterId ?? 1,
        characterIdsArray.map((characterId) => Number(characterId)),
      ).then((data) => {
        setCost(data.data);
      });
    }, [characterIdsArray, characterId]);

    return <Text {...otherProps}>{cost} ISK</Text>;
  },
);
CSPACostText.displayName = "CSPACostText";
