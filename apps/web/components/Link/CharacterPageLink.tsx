import type { LinkProps } from "next/link";
import Link from "next/link";

export type CharacterPageLinkProps = Omit<LinkProps, "href"> & {
  characterId: number | string | null;
};

export const CharacterPageLink = ({
  characterId,
  ...otherProps
}: CharacterPageLinkProps) => {
  return (
    <Link
      href={characterId ? `/character/${characterId}` : "#"}
      {...otherProps}
    />
  );
};
