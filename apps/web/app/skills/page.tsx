import { cacheLife } from "next/cache";

import type { SkillsPageProps } from "./page.client";
import { prisma } from "~/lib/db";
import SkillsPage from "./page.client";

const SKILLS_CATEGORY_ID = 16;

export default async function Page() {
  "use cache";
  cacheLife("days");
  // Deliberately uncaught: a catch inside this `"use cache"` scope would cache
  // the failure as a day-long 404 (e60062ec). Throwing keeps the last good entry.
  const groups: SkillsPageProps["groups"] = await prisma.group.findMany({
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

  return <SkillsPage groups={groups} />;
}
