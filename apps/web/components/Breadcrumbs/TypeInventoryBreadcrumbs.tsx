import { type BreadcrumbsProps } from "@mantine/core";

import { prisma } from "@jitaspace/db";
import { TypeInventoryBreadcrumbs as UITypeInventoryBreadcrumbs } from "@jitaspace/ui";

export type TypeInventoryBreadcrumbsProps = Omit<BreadcrumbsProps, "children"> & {
  typeId?: string | number;
  showType?: boolean;
};

export async function TypeInventoryBreadcrumbs({
  typeId,
  showType,
  ...otherProps
}: TypeInventoryBreadcrumbsProps) {
  const typeIdNum =
    typeof typeId === "string" ? Number.parseInt(typeId) : typeId;

  const type = typeIdNum
    ? await prisma.type.findUnique({
        where: { typeId: typeIdNum },
        select: {
          group: {
            select: {
              groupId: true,
              name: true,
              category: {
                select: {
                  categoryId: true,
                  name: true,
                },
              },
            },
          },
        },
      })
    : null;

  return (
    <UITypeInventoryBreadcrumbs
      typeId={typeId}
      groupId={type?.group?.groupId}
      groupName={type?.group?.name}
      categoryId={type?.group?.category?.categoryId}
      categoryName={type?.group?.category?.name}
      showType={showType}
      {...otherProps}
    />
  );
}
