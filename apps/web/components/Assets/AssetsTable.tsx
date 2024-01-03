import React, { memo } from "react";
import { Badge, Group, Table } from "@mantine/core";

import { CharacterAsset } from "@jitaspace/hooks";
import {
  EveEntityAnchor,
  EveEntityName,
  ISKAmount,
  TypeAnchor,
  TypeAvatar,
  TypeName,
} from "@jitaspace/ui";





type AssetsTableProps = {
  assets: (CharacterAsset & {
    name?: string;
    price?: number;
  })[];
};

export const AssetsTable = memo(({ assets }: AssetsTableProps) => {
  return (
    <Table highlightOnHover>
      <thead>
        <tr>
          <th>Qty</th>
          <th>Type</th>
          <th>Price</th>
          <th>Location</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <tr key={asset.item_id}>
            <td align="right">{asset.quantity}</td>
            <td>
              <Group gap="xs" justify="space-between">
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
            </td>
            <td>
              {asset.price && <ISKAmount align="right" amount={asset.price} />}
            </td>

            <td>
              <Group gap="xs">
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
