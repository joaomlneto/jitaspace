import { memo } from "react";
import { Group, Text } from "@mantine/core";

import { TypeAnchor, TypeAvatar, TypeName } from "@jitaspace/ui";





export type ShipFittingCardModuleSectionEntryProps = {
  typeId: number;
  quantity?: number;
  ammo?: { typeId?: number; quantity: number };
};

export const ShipFittingCardModuleSectionEntry = memo(
  ({ typeId, quantity, ammo }: ShipFittingCardModuleSectionEntryProps) => {
    return (
      <Group wrap="nowrap" gap="xs" py={0} my={0}>
        <TypeAvatar typeId={typeId} variation="icon" size="xs" />
        {quantity && quantity > 1 && (
          <Text size="xs" c="dimmed">
            {quantity}
          </Text>
        )}
        <TypeAnchor typeId={typeId} target="_blank" size="xs">
          <TypeName span typeId={typeId} size="xs" lineClamp={1} />
        </TypeAnchor>
        {ammo && (
          <Group wrap="nowrap" gap="xs" py={0} my={0}>
            <TypeAvatar typeId={ammo.typeId} variation="icon" size="xs" />
            <TypeName typeId={ammo.typeId} size="xs" c="dimmed" />
          </Group>
        )}
      </Group>
    );
  },
);
ShipFittingCardModuleSectionEntry.displayName =
  "ShipFittingCardModuleSectionEntry";
