import { useEffect, useState } from "react";

import {
  getUniverseTypesTypeId,
  type GetUniverseCategoriesCategoryId200,
  type GetUniverseGroupsGroupId200,
  type GetUniverseTypesTypeId200,
  type GetUniverseTypesTypeIdQueryResult,
} from "@jitaspace/esi-client";

import { useCategoryGroups } from "~/hooks/useCategoryGroups";

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
  const { data: groups } = useCategoryGroups(SKILLS_CATEGORY);
  const [types, setTypes] = useState<
    Record<string | number, GetUniverseTypesTypeIdQueryResult>
  >({});
  const [skillTree, setSkillTree] = useState<SkillCategory>();

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
    if (!types || !groups) return;
    if (Object.values(types).some((group) => group.data === undefined)) return;
    console.log("RECOMPUTING HEAVY STUFF AGAIN!");
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
