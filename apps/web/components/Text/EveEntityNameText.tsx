import { useEffect, useState } from "react";
import { Text, type TextProps } from "@mantine/core";

import { postUniverseNames } from "@jitaspace/esi-client";

type Props = TextProps & {
  entityId?: string | number;
};
export default function EveEntityNameText({ entityId, ...otherProps }: Props) {
  const [name, setName] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!entityId) {
      return;
    }

    void postUniverseNames([Number(entityId)], {}, {}).then((data) => {
      setName(data.data[0]?.name);
    });
  }, [entityId]);

  return <Text {...otherProps}>{name}</Text>;
}
