import _React, { memo, useMemo } from "react";
import { Group, JsonInput, Table } from "@mantine/core";

import { useDogmaAttributes, useTypes } from "@jitaspace/hooks";
import {
  DogmaAttributeAnchor,
  DogmaAttributeName,
  TypeAnchor,
  TypeAvatar,
  TypeName,
} from "@jitaspace/ui";





export interface CompareTableProps {
  typeIds: number[];
}

export const CompareTable = memo(({ typeIds }: CompareTableProps) => {
  const { data: types } = useTypes(typeIds);

  const sortedTypes = useMemo(
    () => Object.values(types).sort((a, b) => a.name.localeCompare(b.name)),
    [types],
  );

  const attributeIds = useMemo(
    () => [
      ...new Set(
        sortedTypes
          .flatMap((type) => type.dogma_attributes ?? [])
          .map((entry) => entry?.attribute_id),
      ),
    ],
    [sortedTypes],
  );

  const attributeTypeValues = useMemo(() => {
    const _result: Record<number, { typeId: number; value?: number }> = {};
    const attributeList = attributeIds.map((attributeId) => ({
      attributeId,
      values: sortedTypes.map((type) => ({
        typeId: type.type_id,
        value: type.dogma_attributes?.find(
          (attribute) => attribute.attribute_id === attributeId,
        )?.value,
      })),
    }));
    /*attributeList.forEach(
      (attribute) => (result[attribute.attributeId] = attribute.values),
    );*/
    return attributeList;
  }, [attributeIds, sortedTypes]);

  const nonEqualAttributeIds = useMemo(() => {
    return attributeTypeValues
      .filter(
        (attribute) =>
          new Set(attribute.values.map((type) => type.value)).size > 1,
      )
      .map((entry) => entry.attributeId);
  }, [attributeTypeValues]);

  const { data: attributes } = useDogmaAttributes(nonEqualAttributeIds ?? []);

  const sortedAttributes = useMemo(
    () =>
      Object.values(attributes).sort((a, b) =>
        (a.display_name ?? a.name ?? a.attribute_id.toString()).localeCompare(
          b.display_name ?? b.name ?? b.attribute_id.toString(),
        ),
      ),
    [attributes],
  );

  return (
    <>
      <Table highlightOnHover>
        <Table.Thead>
          <th>Attribute</th>
          {sortedTypes.map((type) => (
            <th key={type.type_id}>
              <Group gap="xs">
                <TypeAvatar typeId={type.type_id} size="sm" />
                <TypeAnchor typeId={type.type_id} target="_blank">
                  <TypeName typeId={type.type_id} />
                </TypeAnchor>
              </Group>
            </th>
          ))}
        </Table.Thead>
        <Table.Tbody>
          {sortedAttributes.map((attribute) => (
            <Table.Tr key={attribute.attribute_id}>
              <Table.Td>
                <DogmaAttributeAnchor
                  attributeId={attribute.attribute_id}
                  target="_blank"
                >
                  <DogmaAttributeName attributeId={attribute.attribute_id} />
                </DogmaAttributeAnchor>
              </Table.Td>
              {sortedTypes.map((type) => (
                <Table.Td key={type.type_id}>
                  {(type.dogma_attributes ?? [])
                    .find(
                      (entry) => entry.attribute_id === attribute.attribute_id,
                    )
                    ?.value.toLocaleString()}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <JsonInput
        label="Types, sorted alphabetically by name"
        value={JSON.stringify(sortedTypes, null, 2)}
        autosize
        maxRows={20}
      />
      <JsonInput
        label="Attribute Ids (whose values differ between at least two of the Types)"
        value={JSON.stringify(nonEqualAttributeIds, null, 2)}
        autosize
        maxRows={20}
      />
      <JsonInput
        label="Attributes (whose values differ between at least two of the Types)"
        value={JSON.stringify(attributes, null, 2)}
        autosize
        maxRows={20}
      />
    </>
  );
});
