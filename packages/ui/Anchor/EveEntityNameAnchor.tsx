"use client";

import React, { memo } from "react";
import { type LinkProps } from "next/link";
import { type AnchorProps } from "@mantine/core";

import { type ResolvableEntityCategory } from "@jitaspace/hooks";

import { EveEntityName } from "../Text";
import { EveEntityAnchor } from "./EveEntityAnchor";


export type EveEntityNameAnchorProps = Omit<
  AnchorProps,
  "children" | "component" | "href"
> &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    entityId?: string | number;
    category?: ResolvableEntityCategory;
  };

export const EveEntityNameAnchor = memo(
  ({ entityId, category, ...props }: EveEntityNameAnchorProps) => {
    return (
      <EveEntityAnchor entityId={entityId} category={category} {...props}>
        <EveEntityName span entityId={entityId} category={category} />
      </EveEntityAnchor>
    );
  },
);
EveEntityNameAnchor.displayName = "EveEntityNameAnchor";
