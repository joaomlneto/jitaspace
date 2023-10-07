import { useEffect, useState } from "react";

import {
  getUniverseGroupsGroupId,
  useGetUniverseCategoriesCategoryId,
  type GetUniverseGroupsGroupIdQueryResponse,
} from "@jitaspace/esi-client-kubb";

export const useCategoryGroups = (
  categoryId: number | undefined,
):
  | {
      loading: true;
      error: undefined;
      data: undefined;
    }
  | {
      loading: false;
      error?: string;
      data: Record<string | number, GetUniverseGroupsGroupIdQueryResponse>;
    } => {
  const { data: category } = useGetUniverseCategoriesCategoryId(
    categoryId ?? 0,
    {},
    {},
    { query: { enabled: categoryId !== undefined } },
  );
  const [groups, setGroups] = useState<
    Record<string | number, GetUniverseGroupsGroupIdQueryResponse>
  >({});

  // once we have the category, get its groups
  useEffect(() => {
    if (!category) return;
    console.log("Recomputing Groups");
    const groupIds = category.groups;
    const promises = groupIds.map((id) => getUniverseGroupsGroupId(id));
    void Promise.all(promises).then((groups) =>
      setGroups(
        groups.reduce(
          (acc, group) => ({ ...acc, [group.group_id]: group }),
          {},
        ),
      ),
    );
  }, [category]);

  if (groups === undefined) {
    return {
      loading: true,
      data: undefined,
      error: undefined,
    };
  }

  return {
    data: groups,
    error: "",
    loading: false,
  };
};
