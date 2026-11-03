import type { LinkProps } from "next/link";

import { HoverPrefetchLink } from "./HoverPrefetchLink";

export type CharacterPageLinkProps = Omit<LinkProps, "href"> & {
  characterId: number | string;
};

export const CharacterPageLink = ({
  characterId,
  ...otherProps
}: CharacterPageLinkProps) => {
  return (
    <HoverPrefetchLink href={`/character/${characterId}`} {...otherProps} />
  );
};
