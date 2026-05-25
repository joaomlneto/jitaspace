"use client";

import type { SelectProps } from "@mantine/core";
import React, { memo, useMemo } from "react";
import { Group, Select, Text } from "@mantine/core";

import { useEsiNameLookup } from "@jitaspace/hooks";

import { EveEntityAvatar } from "../../Avatar";

export type EveEntitySelectProps = Omit<SelectProps, "data"> & {
  entityIds: {
    id: number | string;
    name?: string;
  }[];
};

export const EveEntitySelect = memo(
  ({ entityIds, ...otherProps }: EveEntitySelectProps) => {
    const entityEntries = useMemo(
      () =>
        entityIds.map(({ id }) => ({
          id: typeof id === "string" ? Number.parseInt(id, 10) : id,
        })),
      [entityIds],
    );
    const names = useEsiNameLookup(entityEntries);
    const getNameFromCache = (id: number) => names[id.toString()]?.value?.name;

    return (
      <Select
        data={entityIds
          .map(({ id, name }) => ({
            value: `${id}`,
            label:
              name ??
              getNameFromCache(
                typeof id === "string" ? parseInt(id, 10) : id,
              ) ??
              "",
          }))
          .sort((a, b) => (a.label ?? "").localeCompare(b.label ?? ""))}
        renderOption={({ option }) => (
          <Group wrap="nowrap" gap="xs">
            <EveEntityAvatar entityId={option.value} size={24} />
            <Text size="sm">{option.label}</Text>
          </Group>
        )}
        {...otherProps}
      />
    );
  },
);
EveEntitySelect.displayName = "EveEntitySelect";
