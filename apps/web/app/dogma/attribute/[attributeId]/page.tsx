import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";

import type { AttributeModifierRow, PageProps } from "./page.client";
import type { DogmaAttributeLabel } from "~/components/Dogma";
import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { pageMetadata, toDescription } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { SDE_CACHE_TAG } from "~/lib/sdeCache";
import DogmaAttributePage from "./page.client";

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed;
}

const effectName = (effect: {
  displayName: string | null;
  name: string | null;
}) => nonEmpty(effect.displayName) ?? effect.name;

/** The effect pointers that name an attribute, as players would call them. */
const STAT_ROLES = {
  dischargeAttributeId: "Activation cost",
  durationAttributeId: "Cycle time",
  rangeAttributeId: "Optimal range",
  falloffAttributeId: "Falloff",
  trackingSpeedAttributeId: "Tracking",
  resistanceAttributeId: "Resisted by",
  npcUsageChanceAttributeId: "NPC usage chance",
  npcActivationChanceAttributeId: "NPC activation chance",
  fittingUsageChanceAttributeId: "Side-effect chance",
} as const;

type StatRoleKey = keyof typeof STAT_ROLES;
const STAT_ROLE_KEYS = Object.keys(STAT_ROLES) as StatRoleKey[];

const MODIFIER_SELECT = {
  effectId: true,
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
  effect: {
    select: {
      name: true,
      displayName: true,
      _count: { select: { TypeEffect: { where: { isDeleted: false } } } },
    },
  },
} as const;

/**
 * Everything the page shows except its item list (served by
 * `/api/dogma/attribute/[attributeId]/types`): the attribute, its unit and
 * category, the effects that change it or read it, and the effects that use
 * it as a stat. Returns null for an attribute that does not exist.
 *
 * Not `cacheSdeRead()`: `customDescription` is written by our own script, not
 * by the SDE ingest, so the entry keeps a daily `cacheLife` and only adds the
 * SDE tag, as `app/lp-store/page.tsx` does.
 */
async function getAttributeData(
  attributeId: number,
): Promise<PageProps | null> {
  "use cache";
  cacheLife("days");
  cacheTag(SDE_CACHE_TAG);

  const attribute = await prisma.dogmaAttribute.findUnique({
    select: {
      attributeId: true,
      name: true,
      displayName: true,
      description: true,
      customDescription: true,
      tooltipTitle: true,
      tooltipDescription: true,
      defaultValue: true,
      highIsGood: true,
      published: true,
      stackable: true,
      displayWhenZero: true,
      dataType: true,
      iconId: true,
      minAttributeId: true,
      maxAttributeId: true,
      chargeRechargeTimeId: true,
      DogmaUnit: {
        select: {
          unitId: true,
          name: true,
          displayName: true,
          description: true,
        },
      },
      attributeCategory: {
        select: { attributeCategoryId: true, name: true, description: true },
      },
    },
    where: { attributeId },
  });
  if (!attribute) return null;

  const [modifiedBy, modifies, statEffects, items] = await Promise.all([
    prisma.dogmaEffectModifier.findMany({
      select: MODIFIER_SELECT,
      where: {
        modifiedAttributeId: attributeId,
        isDeleted: false,
        effect: { isDeleted: false },
      },
    }),
    prisma.dogmaEffectModifier.findMany({
      select: MODIFIER_SELECT,
      where: {
        modifyingAttributeId: attributeId,
        isDeleted: false,
        effect: { isDeleted: false },
      },
    }),
    prisma.dogmaEffect.findMany({
      select: {
        effectId: true,
        name: true,
        displayName: true,
        dischargeAttributeId: true,
        durationAttributeId: true,
        rangeAttributeId: true,
        falloffAttributeId: true,
        trackingSpeedAttributeId: true,
        resistanceAttributeId: true,
        npcUsageChanceAttributeId: true,
        npcActivationChanceAttributeId: true,
        fittingUsageChanceAttributeId: true,
      },
      where: {
        isDeleted: false,
        OR: STAT_ROLE_KEYS.map((key) => ({ [key]: attributeId })),
      },
    }),
    prisma.typeAttribute.aggregate({
      where: { attributeId, isDeleted: false, type: { isDeleted: false } },
      _count: true,
      _min: { value: true },
      _max: { value: true },
    }),
  ]);

  // Every attribute the page names: the related ones, and both sides of each
  // modifier.
  const attributeIds = new Set<number>([attributeId]);
  for (const id of [
    attribute.minAttributeId,
    attribute.maxAttributeId,
    attribute.chargeRechargeTimeId,
  ]) {
    if (id !== null) attributeIds.add(id);
  }
  for (const m of [...modifiedBy, ...modifies]) {
    if (m.modifiedAttributeId !== null) attributeIds.add(m.modifiedAttributeId);
    if (m.modifyingAttributeId !== null) {
      attributeIds.add(m.modifyingAttributeId);
    }
  }
  const skillTypeIds = [
    ...new Set(
      [...modifiedBy, ...modifies].flatMap((m) =>
        m.skillTypeId === null ? [] : [m.skillTypeId],
      ),
    ),
  ];
  const [attributes, skills] = await Promise.all([
    prisma.dogmaAttribute.findMany({
      select: {
        attributeId: true,
        name: true,
        displayName: true,
        unitId: true,
        DogmaUnit: { select: { displayName: true } },
      },
      where: { attributeId: { in: [...attributeIds] } },
    }),
    prisma.type.findMany({
      select: { typeId: true, name: true },
      where: { typeId: { in: skillTypeIds } },
    }),
  ]);
  const skillNames = new Map(skills.map((s) => [s.typeId, s.name]));

  const toRow = (m: (typeof modifiedBy)[number]): AttributeModifierRow => ({
    effectId: m.effectId,
    effectName: effectName(m.effect),
    carrierCount: m.effect._count.TypeEffect,
    modifierIndex: m.modifierIndex,
    func: m.func,
    domain: m.domain,
    operator: m.operator,
    modifiedAttributeId: m.modifiedAttributeId,
    modifyingAttributeId: m.modifyingAttributeId,
    groupId: m.groupId,
    groupName: m.group?.name ?? null,
    skillTypeId: m.skillTypeId,
    skillName:
      m.skillTypeId === null ? null : (skillNames.get(m.skillTypeId) ?? null),
    targetEffectId: m.targetEffectId,
    targetEffectName: m.targetEffect ? effectName(m.targetEffect) : null,
  });

  const attributeRef = (id: number | null) =>
    id === null ? null : (attributes.find((a) => a.attributeId === id) ?? null);
  const ref = (id: number | null) => {
    const found = attributeRef(id);
    return found
      ? {
          attributeId: found.attributeId,
          name: found.name,
          displayName: nonEmpty(found.displayName),
        }
      : null;
  };

  return {
    attributeId,
    name: attribute.name,
    displayName: nonEmpty(attribute.displayName),
    customDescription: nonEmpty(attribute.customDescription),
    description: nonEmpty(attribute.description),
    tooltipTitle: nonEmpty(attribute.tooltipTitle),
    tooltipDescription: nonEmpty(attribute.tooltipDescription),
    defaultValue: attribute.defaultValue,
    highIsGood: attribute.highIsGood,
    published: attribute.published,
    stackable: attribute.stackable,
    displayWhenZero: attribute.displayWhenZero,
    dataType: attribute.dataType,
    iconId: attribute.iconId,
    unit: attribute.DogmaUnit
      ? {
          unitId: attribute.DogmaUnit.unitId,
          name: attribute.DogmaUnit.name,
          displayName: nonEmpty(attribute.DogmaUnit.displayName),
          description: nonEmpty(attribute.DogmaUnit.description),
        }
      : null,
    category: attribute.attributeCategory
      ? {
          categoryId: attribute.attributeCategory.attributeCategoryId,
          name: attribute.attributeCategory.name,
          description: nonEmpty(attribute.attributeCategory.description),
        }
      : null,
    minAttribute: ref(attribute.minAttributeId),
    maxAttribute: ref(attribute.maxAttributeId),
    chargeRechargeTimeAttribute: ref(attribute.chargeRechargeTimeId),
    itemCount: items._count,
    valueRange:
      items._min.value === null || items._max.value === null
        ? null
        : { min: items._min.value, max: items._max.value },
    attributes: attributes.map(
      (a): DogmaAttributeLabel => ({
        attributeId: a.attributeId,
        name: a.name,
        displayName: nonEmpty(a.displayName),
        unitId: a.unitId,
        unitSymbol: a.DogmaUnit?.displayName ?? null,
      }),
    ),
    modifiedBy: modifiedBy.map(toRow),
    modifies: modifies.map(toRow),
    statOf: statEffects.flatMap((effect) =>
      STAT_ROLE_KEYS.flatMap((key) =>
        effect[key] === attributeId
          ? [
              {
                effectId: effect.effectId,
                effectName: effectName(effect),
                role: STAT_ROLES[key],
              },
            ]
          : [],
      ),
    ),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ attributeId: string }>;
}): Promise<Metadata> {
  const { attributeId: raw } = await params;
  const attributeId = parsePositiveEntityId(raw);
  if (attributeId === null) return {};
  try {
    const attribute = await prisma.dogmaAttribute.findUnique({
      select: {
        name: true,
        displayName: true,
        description: true,
        customDescription: true,
        tooltipDescription: true,
      },
      where: { attributeId },
    });
    if (!attribute) return {};
    const title = [attribute.displayName, attribute.name].find(Boolean);
    if (!title) return {};
    return pageMetadata({
      title,
      // toDescription strips the links our own descriptions carry.
      description: toDescription(
        nonEmpty(attribute.customDescription) ??
          nonEmpty(attribute.tooltipDescription) ??
          attribute.description,
        `The ${title} dogma attribute in EVE Online — what it does and which items have it.`,
      ),
      path: `/dogma/attribute/${attributeId}`,
      badge: "Dogma Attribute",
    });
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ attributeId: string }>;
}>) {
  const { attributeId: attributeIdParam } = await params;
  const attributeId = parsePositiveEntityId(attributeIdParam);
  if (attributeId === null) {
    notFound();
  }

  // A failed read throws (an error, never stored); a missing attribute is a
  // genuine 404.
  const props = await getAttributeData(attributeId);
  if (!props) {
    notFound();
  }
  return <DogmaAttributePage {...props} />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ attributeId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
