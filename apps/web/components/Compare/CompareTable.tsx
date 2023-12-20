import React, { memo, useMemo } from "react";
import { Group, JsonInput, Table } from "@mantine/core";

import { useDogmaAttributes, useTypes } from "@jitaspace/hooks";
import {
  DogmaAttributeAnchor,
  DogmaAttributeName,
  TypeAnchor,
  TypeAvatar,
  TypeName,
} from "@jitaspace/ui";





export type CompareTableProps = {
  typeIds: number[];
};

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
    const result: Record<number, { typeId: number; value?: number }> = {};
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
  }, attributeTypeValues);

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
      <Table>
        <thead>
          <th>Attribute</th>
          {sortedTypes.map((type) => (
            <th key={type.type_id}>
              <Group noWrap>
                <TypeAvatar typeId={type.type_id} />
                <TypeAnchor typeId={type.type_id} target="_blank">
                  <TypeName typeId={type.type_id} />
                </TypeAnchor>
              </Group>
            </th>
          ))}
        </thead>
        <tbody>
          {sortedAttributes.map((attribute) => (
            <tr key={attribute.attribute_id}>
              <td>
                <DogmaAttributeAnchor
                  attributeId={attribute.attribute_id}
                  target="_blank"
                >
                  <DogmaAttributeName attributeId={attribute.attribute_id} />
                </DogmaAttributeAnchor>
              </td>
              {sortedTypes.map((type) => (
                <td key={type.type_id}>
                  {(type.dogma_attributes ?? [])
                    .find(
                      (entry) => entry.attribute_id === attribute.attribute_id,
                    )
                    ?.value.toLocaleString()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
      <JsonInput
        value={JSON.stringify(sortedTypes, null, 2)}
        autosize
        maxRows={30}
      />
      <JsonInput
        value={JSON.stringify(nonEqualAttributeIds, null, 2)}
        autosize
        maxRows={30}
      />
      <JsonInput
        value={JSON.stringify(attributes, null, 2)}
        autosize
        maxRows={30}
      />
    </>
  );
});
