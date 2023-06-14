import { useEffect, useState } from "react";

import {
  getUniverseGroupsGroupId,
  getUniverseTypesTypeId,
  useGetUniverseCategoriesCategoryId,
  type GetUniverseCategoriesCategoryId200,
  type GetUniverseGroupsGroupId200,
  type GetUniverseGroupsGroupIdQueryResult,
  type GetUniverseTypesTypeId200,
  type GetUniverseTypesTypeIdQueryResult,
} from "@jitaspace/esi-client";

const SKILLS_CATEGORY = 16;

type SkillCategory = Omit<GetUniverseCategoriesCategoryId200, "groups"> & {
  groups: Record<
    string | number,
    Omit<GetUniverseGroupsGroupId200, "types"> & {
      types: Record<string | number, GetUniverseTypesTypeId200>;
    }
  >;
};

export function useSkillTree(): {
  loading: boolean;
  error?: string;
  data?: SkillCategory;
} {
  const { data: category } =
    useGetUniverseCategoriesCategoryId(SKILLS_CATEGORY);
  const [groups, setGroups] = useState<
    Record<string | number, GetUniverseGroupsGroupIdQueryResult>
  >({});
  const [types, setTypes] = useState<
    Record<string | number, GetUniverseTypesTypeIdQueryResult>
  >({});
  const [skillTree, setSkillTree] = useState<SkillCategory>();

  // once we have the category, get its groups
  useEffect(() => {
    if (!category?.data) return;
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
  }, [category]);

  // once we have the groups, get their types
  useEffect(() => {
    if (!groups) return;
    if (Object.values(groups).some((group) => group.data === undefined)) return;
    const typeIds = [
      ...new Set(Object.values(groups).flatMap((group) => group.data.types)),
    ];
    const promises = typeIds.map((id) => getUniverseTypesTypeId(id));
    void Promise.all(promises).then((types) =>
      setTypes(
        types.reduce(
          (acc, type) => ({ ...acc, [type.data.type_id]: type }),
          {},
        ),
      ),
    );
  }, [groups]);

  // once we have all the types, build the tree
  useEffect(() => {
    if (!types) return;
    if (Object.values(types).some((group) => group.data === undefined)) return;
    const tree: SkillCategory = Object.values(groups).reduce(
      (acc, group) => ({
        ...acc,
        groups: {
          ...acc.groups,
          [group.data.group_id]: {
            ...group.data,
            types: Object.values(types)
              .filter((type) => group.data.types.includes(type.data.type_id))
              .reduce(
                (acc, type) => ({
                  ...acc,
                  [type.data.type_id]: type.data,
                }),
                {},
              ),
          },
        },
      }),
      {} as SkillCategory,
    );
    setSkillTree(tree);
  }, [groups, types]);

  if (skillTree === undefined) {
    return {
      loading: true,
    };
  }

  return {
    data: skillTree,
    error: "",
    loading: false,
  };
}
