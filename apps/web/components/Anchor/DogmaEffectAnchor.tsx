"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import { Anchor } from "@mantine/core";

import { HoverPrefetchLink } from "~/components/Link";

export type DogmaEffectAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    effectId?: string | number | null;
  };

export const DogmaEffectAnchor = memo(
  ({ effectId, children, prefetch, ...otherProps }: DogmaEffectAnchorProps) => {
    // While the id is nullish the children render unlinked, so the href never
    // reads `/dogma/effect/undefined` (see CorporationAnchor).
    if (effectId === null || effectId === undefined) {
      return <Anchor {...otherProps}>{children}</Anchor>;
    }

    return (
      <Anchor
        component={HoverPrefetchLink}
        href={`/dogma/effect/${effectId}`}
        prefetch={prefetch}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
DogmaEffectAnchor.displayName = "DogmaEffectAnchor";
