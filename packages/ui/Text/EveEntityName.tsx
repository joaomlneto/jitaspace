import React, { memo, useEffect, useState } from "react";
import { Text, type TextProps } from "@mantine/core";

import { postUniverseNames } from "@jitaspace/esi-client";
import {
  allianceIdRanges,
  characterIdRanges,
  corporationIdRanges,
  isIdInRanges,
} from "@jitaspace/utils";

import { AllianceName } from "./AllianceName";
import { CharacterName } from "./CharacterName";
import { CorporationName } from "./CorporationName";

type Props = TextProps & {
  entityId?: string | number;
};

export const EveEntityName = memo(({ entityId, ...otherProps }: Props) => {
  const id = typeof entityId === "string" ? parseInt(entityId) : entityId;

  if (!id) {
    return <Text {...otherProps} />;
  }

  if (isIdInRanges(id, characterIdRanges)) {
    return <CharacterName characterId={id} {...otherProps} />;
  }

  if (isIdInRanges(id, corporationIdRanges)) {
    return <CorporationName corporationId={id} {...otherProps} />;
  }

  if (isIdInRanges(id, allianceIdRanges)) {
    return <AllianceName allianceId={id} {...otherProps} />;
  }

  // FIXME: Add more ranges!

  // Resolve wtf this is in the worst possible way - via a POST request!
  return <UnknownEveEntityName entityId={id} {...otherProps} />;
});
EveEntityName.displayName = "EveEntityName";

type UnknownEveEntityNameProps = TextProps & {
  entityId?: string | number;
};

const UnknownEveEntityName = memo(
  ({ entityId, ...otherProps }: UnknownEveEntityNameProps) => {
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
  },
);
UnknownEveEntityName.displayName = "UnknownEveEntityName";
