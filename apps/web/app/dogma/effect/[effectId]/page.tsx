import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";

import type { PageProps } from "./page.client";
import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { resolveEffectDescription } from "~/lib/dogmaEffectDescription";
import { pageMetadata, toDescription } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { SDE_CACHE_TAG } from "~/lib/sdeCache";
import DogmaEffectPage from "./page.client";

const effectName = (effect: {
  displayName: string | null;
  name: string | null;
}) => [effect.displayName, effect.name].find(Boolean) ?? null;

/**
 * Everything the page shows, from the database: the effect's own row, its
 * modifiers with the names they point at, the effects that stop it, and the
 * types that carry it along with their values for the modifying attributes.
 * Returns null for an effect that does not exist.
 *
 * Not `cacheSdeRead()`: `customDescription` is written by our own script, not
 * by the SDE ingest, so the entry keeps a daily `cacheLife` and only adds the
 * SDE tag, as `app/lp-store/page.tsx` does.
 */
async function getEffectData(effectId: number): Promise<PageProps | null> {
  "use cache";
  cacheLife("days");
  cacheTag(SDE_CACHE_TAG);

  const effect = await prisma.dogmaEffect.findUnique({
    select: {
      effectId: true,
      name: true,
      displayName: true,
      description: true,
      customDescription: true,
      published: true,
      iconId: true,
      guid: true,
      distribution: true,
      effectCategoryId: true,
      effectCategory: { select: { name: true } },
      disallowAutoRepeat: true,
      electronicChance: true,
      isAssistance: true,
      isOffensive: true,
      isWarpSafe: true,
      propulsionChance: true,
      rangeChance: true,
      dischargeAttributeId: true,
      durationAttributeId: true,
      rangeAttributeId: true,
      falloffAttributeId: true,
      trackingSpeedAttributeId: true,
      resistanceAttributeId: true,
      npcUsageChanceAttributeId: true,
      npcActivationChanceAttributeId: true,
      fittingUsageChanceAttributeId: true,
      preExpression: true,
      postExpression: true,
      DogmaEffectModifiers: {
        select: {
          modifierIndex: true,
          func: true,
          domain: true,
          operator: true,
          modifiedAttributeId: true,
          modifyingAttributeId: true,
          groupId: true,
          group: { select: { name: true } },
          skillTypeId: true,
          targetEffectId: true,
          targetEffect: { select: { name: true, displayName: true } },
        },
        where: { isDeleted: false },
        orderBy: { modifierIndex: "asc" },
      },
      ModifiedDogmaEffect: {
        select: {
          func: true,
          domain: true,
          effect: { select: { effectId: true, name: true, displayName: true } },
        },
        where: { isDeleted: false },
      },
      TypeEffect: {
        select: {
          isDefault: true,
          type: {
            select: {
              typeId: true,
              name: true,
              published: true,
              groupId: true,
              group: { select: { name: true, categoryId: true } },
            },
          },
        },
        where: { isDeleted: false },
      },
    },
    where: { effectId },
  });
  if (!effect) return null;

  const modifiers = effect.DogmaEffectModifiers;

  const stats: PageProps["stats"] = {
    discharge: effect.dischargeAttributeId,
    duration: effect.durationAttributeId,
    range: effect.rangeAttributeId,
    falloff: effect.falloffAttributeId,
    trackingSpeed: effect.trackingSpeedAttributeId,
    resistance: effect.resistanceAttributeId,
    npcUsageChance: effect.npcUsageChanceAttributeId,
    npcActivationChance: effect.npcActivationChanceAttributeId,
    fittingUsageChance: effect.fittingUsageChanceAttributeId,
  };

  const modifyingAttributeIds = [
    ...new Set(
      modifiers.flatMap((modifier) =>
        modifier.modifyingAttributeId === null
          ? []
          : [modifier.modifyingAttributeId],
      ),
    ),
  ];
  const attributeIds = [
    ...new Set([
      ...Object.values(stats).filter((id): id is number => id !== null),
      ...modifyingAttributeIds,
      ...modifiers.flatMap((modifier) =>
        modifier.modifiedAttributeId === null
          ? []
          : [modifier.modifiedAttributeId],
      ),
    ]),
  ];
  const skillTypeIds = [
    ...new Set(
      modifiers.flatMap((modifier) =>
        modifier.skillTypeId === null ? [] : [modifier.skillTypeId],
      ),
    ),
  ];

  const [attributes, skills, typeValues] = await Promise.all([
    prisma.dogmaAttribute.findMany({
      select: {
        attributeId: true,
        name: true,
        displayName: true,
        unitId: true,
        DogmaUnit: { select: { displayName: true } },
      },
      where: { attributeId: { in: attributeIds } },
    }),
    prisma.type.findMany({
      select: { typeId: true, name: true },
      where: { typeId: { in: skillTypeIds } },
    }),
    modifyingAttributeIds.length === 0
      ? Promise.resolve([])
      : prisma.typeAttribute.findMany({
          select: { typeId: true, attributeId: true, value: true },
          where: {
            attributeId: { in: modifyingAttributeIds },
            isDeleted: false,
            type: { effects: { some: { effectId, isDeleted: false } } },
          },
        }),
  ]);

  const skillNames = new Map(skills.map((skill) => [skill.typeId, skill.name]));
  const valuesByType = new Map<number, Record<number, number>>();
  for (const { typeId, attributeId, value } of typeValues) {
    const values = valuesByType.get(typeId) ?? {};
    values[attributeId] = value;
    valuesByType.set(typeId, values);
  }

  const targetedBy = new Map<number, PageProps["targetedBy"][number]>();
  for (const modifier of effect.ModifiedDogmaEffect) {
    targetedBy.set(modifier.effect.effectId, {
      effectId: modifier.effect.effectId,
      name: effectName(modifier.effect),
      func: modifier.func,
      domain: modifier.domain,
    });
  }

  return {
    effectId,
    name: effect.name,
    displayName: effect.displayName,
    description: effect.description?.length ? effect.description : null,
    customDescription: effect.customDescription?.trim()
      ? effect.customDescription
      : null,
    published: effect.published,
    iconId: effect.iconId,
    guid: effect.guid?.length ? effect.guid : null,
    distribution: effect.distribution,
    category:
      effect.effectCategoryId === null
        ? null
        : {
            effectCategoryId: effect.effectCategoryId,
            name: effect.effectCategory?.name ?? null,
          },
    flags: {
      isOffensive: effect.isOffensive,
      isAssistance: effect.isAssistance,
      isWarpSafe: effect.isWarpSafe,
      disallowAutoRepeat: effect.disallowAutoRepeat,
      electronicChance: effect.electronicChance,
      propulsionChance: effect.propulsionChance,
      rangeChance: effect.rangeChance,
    },
    stats,
    preExpression: effect.preExpression,
    postExpression: effect.postExpression,
    attributes: attributes.map((attribute) => ({
      attributeId: attribute.attributeId,
      name: attribute.name,
      displayName: attribute.displayName,
      unitId: attribute.unitId,
      unitSymbol: attribute.DogmaUnit?.displayName ?? null,
    })),
    modifiers: modifiers.map((modifier) => ({
      modifierIndex: modifier.modifierIndex,
      func: modifier.func,
      domain: modifier.domain,
      operator: modifier.operator,
      modifiedAttributeId: modifier.modifiedAttributeId,
      modifyingAttributeId: modifier.modifyingAttributeId,
      groupId: modifier.groupId,
      groupName: modifier.group?.name ?? null,
      skillTypeId: modifier.skillTypeId,
      skillName:
        modifier.skillTypeId === null
          ? null
          : (skillNames.get(modifier.skillTypeId) ?? null),
      targetEffectId: modifier.targetEffectId,
      targetEffectName: modifier.targetEffect
        ? effectName(modifier.targetEffect)
        : null,
    })),
    targetedBy: [...targetedBy.values()].sort(
      (a, b) => a.effectId - b.effectId,
    ),
    types: effect.TypeEffect.map(({ isDefault, type }) => ({
      typeId: type.typeId,
      name: type.name,
      published: type.published,
      groupId: type.groupId,
      groupName: type.group.name,
      categoryId: type.group.categoryId,
      isDefault,
      values: valuesByType.get(type.typeId) ?? {},
    })),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ effectId: string }>;
}): Promise<Metadata> {
  const { effectId: raw } = await params;
  const effectId = parsePositiveEntityId(raw);
  if (effectId === null) return {};
  try {
    const effect = await prisma.dogmaEffect.findUnique({
      select: {
        name: true,
        displayName: true,
        description: true,
        customDescription: true,
      },
      where: { effectId },
    });
    if (!effect) return {};
    const title = effectName(effect);
    if (!title) return {};
    // toDescription strips the links our own descriptions carry.
    const described = resolveEffectDescription(
      effect.description,
      effect.customDescription,
    );
    return pageMetadata({
      title,
      description: toDescription(
        described?.text,
        `The ${title} dogma effect in EVE Online — what it does and which items apply it.`,
      ),
      path: `/dogma/effect/${effectId}`,
      badge: "Dogma Effect",
    });
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ effectId: string }>;
}>) {
  const { effectId: effectIdParam } = await params;
  const effectId = parsePositiveEntityId(effectIdParam);
  if (effectId === null) {
    notFound();
  }

  // Outside the "use cache" scope and inside <Suspense>: a failed read renders
  // a transient not-found (HTTP 200) that is never stored. See apps/web
  // CLAUDE.md on the dynamic [param] routes.
  let props: PageProps | null;
  try {
    props = await getEffectData(effectId);
  } catch {
    notFound();
  }
  if (!props) {
    notFound();
  }
  return <DogmaEffectPage {...props} />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ effectId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
