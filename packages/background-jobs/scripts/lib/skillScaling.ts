import type { Ref } from "../../utils/dogmaEffectDescriptions";
import { prisma } from "../../db";
import { SKILL_CATEGORY_ID } from "../../utils/dogmaEffectDescriptions";

/**
 * Hull bonus attribute → the ship skills that multiply it by their trained
 * level. A ship's bonus attribute (shipBonusMF, freighterBonusM1…) holds a
 * per-level figure: a skill effect pre- or post-multiplies it by the pilot's
 * level (PreMul for frigates, PostMul for Exhumers), so "5%" really reads
 * "5% per Minmatar Frigate level".
 */
export async function readSkillScaling(
  attributeIds: number[],
): Promise<Map<number, Ref[]>> {
  const rows = await prisma.dogmaEffectModifier.findMany({
    where: {
      isDeleted: false,
      func: "ItemModifier",
      domain: "shipID",
      operator: { in: [0, 4] },
      modifiedAttributeId: { in: attributeIds },
      modifyingAttribute: { name: "skillLevel" },
    },
    select: {
      modifiedAttributeId: true,
      effect: {
        select: {
          TypeEffect: {
            where: { isDeleted: false },
            select: {
              type: {
                select: {
                  typeId: true,
                  name: true,
                  group: { select: { categoryId: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  const scaledBy = new Map<number, Ref[]>();
  for (const { modifiedAttributeId, effect } of rows) {
    if (modifiedAttributeId === null) continue;
    const skills = scaledBy.get(modifiedAttributeId) ?? [];
    for (const { type } of effect.TypeEffect) {
      const known = skills.some((skill) => skill.id === type.typeId);
      if (type.group.categoryId === SKILL_CATEGORY_ID && !known) {
        skills.push({ id: type.typeId, name: type.name });
      }
    }
    if (skills.length > 0) scaledBy.set(modifiedAttributeId, skills);
  }
  return scaledBy;
}
