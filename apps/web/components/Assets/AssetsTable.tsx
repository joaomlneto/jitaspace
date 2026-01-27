import type {CharacterAsset} from "@jitaspace/hooks";
import {EveEntityAnchor, EveEntityName, ISKAmount, TypeAnchor, TypeAvatar, TypeName,} from "@jitaspace/ui";
import {Badge, Group, Table} from "@mantine/core";
import _React, {memo} from "react";


interface AssetsTableProps {
  assets: (CharacterAsset & {
    name?: string;
    price?: number;
  })[];
}

export const AssetsTable = memo(({assets}: AssetsTableProps) => {
  return (
    <Table highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <th>Qty</th>
          <th>Type</th>
          <th>Price</th>
          <th>Location</th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {assets.map((asset) => (
          <Table.Tr key={asset.item_id}>
            <Table.Td align="right">{asset.quantity}</Table.Td>
            <Table.Td>
              <Group gap="xs" justify="space-between">
                <Group wrap="nowrap" gap="xs">
                  <TypeAvatar size="xs" typeId={asset.type_id}/>
                  <TypeAnchor typeId={asset.type_id}>
                    <TypeName typeId={asset.type_id}/>
                  </TypeAnchor>
                </Group>
                <Group gap="xs" justify="flex-end">
                  {asset.is_singleton && <Badge size="xs">assembled</Badge>}
                  {asset.is_blueprint_copy && <Badge size="xs">BPC</Badge>}
                </Group>
              </Group>
            </Table.Td>
            <Table.Td>
              {asset.price && <ISKAmount ta="right" amount={asset.price}/>}
            </Table.Td>

            <Table.Td>
              <Group gap="xs">
                <EveEntityAnchor entityId={asset.location_id}>
                  <EveEntityName entityId={asset.location_id}/>
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
