import React, { memo } from "react";
import { type AnchorProps } from "@mantine/core";

import { type ResolvableEntityCategory } from "@jitaspace/esi-client";

import { EveEntityName } from "../Text";
import { EveEntityAnchor } from "./EveEntityAnchor";

export type EveEntityNameAnchorProps = Omit<
  AnchorProps,
  "children" | "component" | "href"
> & {
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
