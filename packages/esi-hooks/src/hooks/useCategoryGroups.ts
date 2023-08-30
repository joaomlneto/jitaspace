import { useEffect, useState } from "react";

import {
  getUniverseGroupsGroupId,
  useGetUniverseCategoriesCategoryId,
  type GetUniverseGroupsGroupIdQueryResult,
} from "@jitaspace/esi-client";

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
      data: Record<string | number, GetUniverseGroupsGroupIdQueryResult>;
    } => {
  const { data: category } = useGetUniverseCategoriesCategoryId(
    categoryId ?? 0,
    {},
    { swr: { enabled: categoryId !== undefined } },
  );
  const [groups, setGroups] = useState<
    Record<string | number, GetUniverseGroupsGroupIdQueryResult>
  >({});

  // once we have the category, get its groups
  useEffect(() => {
    if (!category?.data) return;
    console.log("Recomputing Groups");
    const groupIds = category.data.groups;
    const promises = groupIds.map((id) => getUniverseGroupsGroupId(id));
    void Promise.all(promises).then((groups) =>
      setGroups(
        groups.reduce(
          (acc, group) => ({ ...acc, [group.data.group_id]: group }),
          {},
        ),
      ),
    );
  }, [category?.data]);

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
