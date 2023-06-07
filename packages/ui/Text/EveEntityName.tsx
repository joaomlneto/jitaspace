import { useEffect, useState } from "react";
import { Text, type TextProps } from "@mantine/core";

import { postUniverseNames } from "@jitaspace/esi-client";

type Props = TextProps & {
  entityId?: string | number;
};
export function EveEntityName({ entityId, ...otherProps }: Props) {
  const [name, setName] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!entityId) {
      return;
    }

    void postUniverseNames([Number(entityId)], {}, {})
      .then((data) => {
        setName(data.data[0]?.name);
      })
      .catch((err) => {
        setError(JSON.stringify(err));
      });
  }, [entityId]);

  return (
    <Text {...otherProps}>
      {name ??
        (error !== undefined ? (
          <Text span color="dimmed">
            Name Unknown
          </Text>
        ) : (
          "?"
        ))}
    </Text>
  );
}
