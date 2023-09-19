import React, { memo } from "react";
import { Badge, Group, Table, Text } from "@mantine/core";

import { GetCharactersCharacterIdAssets200Item } from "@jitaspace/esi-client";
import {
  EveEntityAnchor,
  EveEntityName,
  ISKAmount,
  TypeAnchor,
  TypeAvatar,
  TypeName,
} from "@jitaspace/ui";

type AssetsTableProps = {
  assets: (GetCharactersCharacterIdAssets200Item & {
    name?: string;
    price?: number;
  })[];
};

export const AssetsTable = memo(({ assets }: AssetsTableProps) => {
  return (
    <Table highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Item ID</Table.Th>
          <Table.Th>Qty</Table.Th>
          <Table.Th>Type</Table.Th>
          <Table.Th>Price</Table.Th>
          <Table.Th>Location</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {assets.map((asset) => (
          <Table.Tr key={asset.item_id}>
            <Table.Td>
              <Text size="xs" color="dimmed">
                {asset.item_id}
              </Text>
            </Table.Td>
            <Table.Td align="right">{asset.quantity}</Table.Td>
            <Table.Td>
              <Group gap="xs" position="apart">
                <Group wrap="nowrap" gap="xs">
                  <TypeAvatar size="xs" typeId={asset.type_id} />
                  <TypeAnchor typeId={asset.type_id}>
                    <TypeName typeId={asset.type_id} />
                  </TypeAnchor>
                </Group>
                <Group gap="xs" position="right">
                  {asset.is_singleton && <Badge size="xs">assembled</Badge>}
                  {asset.is_blueprint_copy && <Badge size="xs">BPC</Badge>}
                </Group>
              </Group>
            </Table.Td>
            <Table.Td>
              {asset.price && <ISKAmount align="right" amount={asset.price} />}
            </Table.Td>

            <Table.Td>
              <Group gap="xs">
                <EveEntityAnchor entityId={asset.location_id}>
                  <EveEntityName entityId={asset.location_id} />
                </EveEntityAnchor>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
});
AssetsTable.displayName = "AssetsTable";
