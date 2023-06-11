import { memo } from "react";
import { Avatar, type AvatarProps } from "@mantine/core";

import { useEsiName } from "../hooks";
import { AllianceAvatar } from "./AllianceAvatar";
import { CharacterAvatar } from "./CharacterAvatar";
import { CorporationAvatar } from "./CorporationAvatar";
import { EveImageServerAvatar } from "./EveImageServerAvatar";

export type EveEntityAvatarProps = Omit<AvatarProps, "src"> & {
  id: string | number;
};

export const EveEntityAvatar = memo(
  ({ id, ...otherProps }: EveEntityAvatarProps) => {
    const { category, loading, error } = useEsiName(id);
    id = typeof id === "string" ? parseInt(id) : id;

    if (!category || error) {
      return <EveImageServerAvatar {...otherProps} />;
    }

    if (category === "character" || category === "agent") {
      return <CharacterAvatar characterId={id} {...otherProps} />;
    }

    if (category === "corporation") {
      return <CorporationAvatar corporationId={id} {...otherProps} />;
    }

    if (category === "alliance") {
      return <AllianceAvatar allianceId={id} {...otherProps} />;
    }

    // FIXME: Add more ranges!

    // Resolve wtf this is in the worst possible way - via a POST request!
    return <Avatar {...otherProps} />;
  },
);
EveEntityAvatar.displayName = "EveEntityAvatar";
