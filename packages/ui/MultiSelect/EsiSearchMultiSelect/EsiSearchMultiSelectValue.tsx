"use client";

import type { ComboboxItem } from "@mantine/core";
import React from "react";
import { CloseButton, Group, Pill, rem } from "@mantine/core";

import { EveEntityAvatar } from "../../Avatar";
import { EveEntityName } from "../../Text";

// Pill rendered for each selected value in EsiSearchMultiSelect.
export type EsiSearchMultiSelectValueProps = {
  option?: ComboboxItem;
  value: string;
  onRemove: () => void;
  disabled?: boolean;
};

export function EsiSearchMultiSelectValue({
  value,
  onRemove,
  disabled,
}: EsiSearchMultiSelectValueProps) {
  return (
    <Pill
      p={0}
      withRemoveButton={!disabled}
      onRemove={onRemove}
      disabled={disabled}
    >
      <Group wrap="nowrap" gap={rem(4)} align="center">
        <EveEntityAvatar entityId={value} size={22} radius="xl" />
        <EveEntityName entityId={value} size="sm" />
      </Group>
    </Pill>
  );
}
