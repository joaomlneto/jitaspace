import { cacheLife } from "next/cache";

import type { SkillsPageProps } from "./page.client";
import { prisma } from "~/lib/db";
import SkillsPage from "./page.client";

const SKILLS_CATEGORY_ID = 16;

export default async function Page() {
  "use cache";
  cacheLife("days");
  // Deliberately uncaught. A catch here — inside the `"use cache"` scope —
  // would make `notFound()` a *successful* render that Next stores and serves
  // for the whole `cacheLife` window. Throwing writes nothing to the cache, so
  // the route recovers as soon as the database does. See CLAUDE.md → "Never
  // catch a database error inside a `"use cache"` scope".
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
