/** One item that has a dogma attribute, with its value. */
export interface DogmaAttributeTypeRow {
  typeId: number;
  name: string;
  published: boolean;
  groupId: number;
  groupName: string;
  categoryId: number;
  categoryName: string;
  value: number;
}

/**
 * The item list as `/api/dogma/attribute/[attributeId]/types` sends it: each
 * group and category named once, and each row as a short tuple. Written out
 * as objects, the 26,692 rows of `mass` came to 4.6 MB, past the 4.5 MB a
 * Vercel function may return.
 */
export interface DogmaAttributeTypesPayload {
  /** groupId → [group name, categoryId]. */
  groups: Record<number, [string, number]>;
  /** categoryId → category name. */
  categories: Record<number, string>;
  /** [typeId, name, published (1 or 0), groupId, value]. */
  rows: [number, string, 0 | 1, number, number][];
}

export function packTypeRows(
  rows: readonly DogmaAttributeTypeRow[],
): DogmaAttributeTypesPayload {
  const payload: DogmaAttributeTypesPayload = {
    groups: {},
    categories: {},
    rows: [],
  };
  for (const row of rows) {
    payload.groups[row.groupId] = [row.groupName, row.categoryId];
    payload.categories[row.categoryId] = row.categoryName;
    payload.rows.push([
      row.typeId,
      row.name,
      row.published ? 1 : 0,
      row.groupId,
      row.value,
    ]);
  }
  return payload;
}

export function unpackTypeRows(
  payload: DogmaAttributeTypesPayload,
): DogmaAttributeTypeRow[] {
  return payload.rows.map(([typeId, name, published, groupId, value]) => {
    const [groupName = `Group ${groupId}`, categoryId = 0] =
      payload.groups[groupId] ?? [];
    return {
      typeId,
      name,
      published: published === 1,
      groupId,
      groupName,
      categoryId,
      categoryName: payload.categories[categoryId] ?? `Category ${categoryId}`,
      value,
    };
  });
}
