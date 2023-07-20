import React, { memo } from "react";
import { Select, type SelectProps } from "@mantine/core";

import { useEsiNamesCache } from "@jitaspace/esi-client";

import { EveEntitySelectItem } from "./EveEntitySelectItem";

export type EveEntitySelectProps = Omit<SelectProps, "data"> & {
  entityIds: {
    id: number | string;
    name?: string;
  }[];
};

export const EveEntitySelect = memo(
  ({ entityIds, ...otherProps }: EveEntitySelectProps) => {
    const cache = useEsiNamesCache();
    const getNameFromCache = (id: number) => cache[id]?.value?.name;

    return (
      <Select
        data={entityIds
          .map(({ id, name }) => ({
            value: `${id}`,
            label:
              name ??
              getNameFromCache(typeof id === "string" ? parseInt(id) : id) ??
              "",
          }))
          .sort((a, b) => (a.label ?? "").localeCompare(b.label ?? ""))}
        itemComponent={EveEntitySelectItem}
        {...otherProps}
      />
    );
  },
);
EveEntitySelect.displayName = "EsiSearchSelect";
