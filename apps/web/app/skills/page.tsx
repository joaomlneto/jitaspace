import { notFound } from "next/navigation";

import { prisma } from "@jitaspace/db";

import SkillsPage from "./page.client";
import type { SkillsPageProps } from "./page.client";

const SKILLS_CATEGORY_ID = 16;

export const revalidate = 86400;

export default async function Page() {
  let groups: SkillsPageProps["groups"] = [];
  try {
    groups = await prisma.group.findMany({
      select: {
        groupId: true,
        name: true,
        published: true,
        types: {
          select: {
            typeId: true,
            name: true,
            description: true,
            iconId: true,
            graphicId: true,
            published: true,
            attributes: {
              select: {
                attributeId: true,
                value: true,
              },
            },
          },
        },
      },
      where: {
        categoryId: SKILLS_CATEGORY_ID,
      },
    });
  } catch {
    notFound();
  }

  return <SkillsPage groups={groups} />;
}
