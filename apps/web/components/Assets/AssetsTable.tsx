import React, { memo } from "react";
import { Badge, Group, Table, Text } from "@mantine/core";

import { GetCharactersCharacterIdAssetsQueryResponse } from "@jitaspace/esi-client-kubb";
import {
  EveEntityAnchor,
  EveEntityName,
  ISKAmount,
  TypeAnchor,
  TypeAvatar,
  TypeName,
} from "@jitaspace/ui";





type AssetsTableProps = {
  assets: (GetCharactersCharacterIdAssetsQueryResponse[number] & {
    name?: string;
    price?: number;
  })[];
};

export const AssetsTable = memo(({ assets }: AssetsTableProps) => {
  return (
    <Table highlightOnHover>
      <thead>
        <tr>
          <th>Item ID</th>
          <th>Qty</th>
          <th>Type</th>
          <th>Price</th>
          <th>Location</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <tr key={asset.item_id}>
            <td>
              <Text size="xs" color="dimmed">
                {asset.item_id}
              </Text>
            </td>
            <td align="right">{asset.quantity}</td>
            <td>
              <Group spacing="xs" position="apart">
                <Group noWrap spacing="xs">
                  <TypeAvatar size="xs" typeId={asset.type_id} />
                  <TypeAnchor typeId={asset.type_id}>
                    <TypeName typeId={asset.type_id} />
                  </TypeAnchor>
                </Group>
                <Group spacing="xs" position="right">
                  {asset.is_singleton && <Badge size="xs">assembled</Badge>}
                  {asset.is_blueprint_copy && <Badge size="xs">BPC</Badge>}
                </Group>
              </Group>
            </td>
            <td>
              {asset.price && <ISKAmount align="right" amount={asset.price} />}
            </td>

            <td>
              <Group spacing="xs">
                <EveEntityAnchor entityId={asset.location_id}>
                  <EveEntityName entityId={asset.location_id} />
                </EveEntityAnchor>
              </Group>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
});
AssetsTable.displayName = "AssetsTable";
