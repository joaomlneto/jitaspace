"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import Link from "next/link";
import { Anchor } from "@mantine/core";

export type DogmaEffectAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    effectId: string | number;
  };

export const DogmaEffectAnchor = memo(
  ({ effectId, children, ...otherProps }: DogmaEffectAnchorProps) => {
    return (
      <Anchor
        component={Link}
        href={`/dogma/effect/${effectId}`}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
DogmaEffectAnchor.displayName = "DogmaEffectAnchor";
