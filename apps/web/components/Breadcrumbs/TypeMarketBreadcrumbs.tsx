import { type BreadcrumbsProps } from "@mantine/core";

import { prisma } from "@jitaspace/db";
import { TypeMarketBreadcrumbs as UITypeMarketBreadcrumbs } from "@jitaspace/ui";

export type TypeMarketBreadcrumbsProps = Omit<BreadcrumbsProps, "children"> & {
  typeId?: string | number;
  showType?: boolean;
};

export async function TypeMarketBreadcrumbs({
  typeId,
  showType,
  ...otherProps
}: TypeMarketBreadcrumbsProps) {
  const typeIdNum =
    typeof typeId === "string" ? Number.parseInt(typeId) : typeId;

  const type = typeIdNum
    ? await prisma.type.findUnique({
        where: { typeId: typeIdNum },
        select: {
          marketGroup: {
            select: {
              marketGroupId: true,
              name: true,
              parent: {
                select: {
                  marketGroupId: true,
                  name: true,
                  parent: {
                    select: {
                      marketGroupId: true,
                      name: true,
                      parent: {
                        select: {
                          marketGroupId: true,
                          name: true,
                          parent: {
                            select: {
                              marketGroupId: true,
                              name: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })
    : null;

  const mg1 = type?.marketGroup;
  const mg2 = mg1?.parent;
  const mg3 = mg2?.parent;
  const mg4 = mg3?.parent;
  const mg5 = mg4?.parent;

  const marketGroups: { market_group_id: number; name: string }[] = [];
  if (mg5) marketGroups.push({ market_group_id: mg5.marketGroupId, name: mg5.name });
  if (mg4) marketGroups.push({ market_group_id: mg4.marketGroupId, name: mg4.name });
  if (mg3) marketGroups.push({ market_group_id: mg3.marketGroupId, name: mg3.name });
  if (mg2) marketGroups.push({ market_group_id: mg2.marketGroupId, name: mg2.name });
  if (mg1) marketGroups.push({ market_group_id: mg1.marketGroupId, name: mg1.name });

  return (
    <UITypeMarketBreadcrumbs
      typeId={typeId}
      marketGroups={marketGroups.length > 0 ? marketGroups : undefined}
      showType={showType}
      {...otherProps}
    />
  );
}
