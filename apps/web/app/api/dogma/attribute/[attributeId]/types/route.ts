import { prisma } from "~/lib/db";
import { parsePositiveEntityId } from "~/lib/routeParams";

/** One item that has the attribute, with its value. */
export interface DogmaAttributeTypeRow {
  typeId: number;
  name: string;
  published: boolean;
  groupId: number;
  groupName: string;
  categoryId: number;
  categoryName: string;
  value: number;
}

/**
 * Every item that has a dogma attribute, with its value, as JSON: the rows of
 * `/dogma/attribute/[attributeId]`'s Types table. The page ships without them
 * (`mass` alone is on 26,700 items) and the table fetches them when it mounts.
 *
 * SDE data, so the CDN keeps it for a day and serves a stale copy for a week
 * while it refreshes.
 */
const CACHE_OK =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attributeId: string }> },
): Promise<Response> {
  const { attributeId: raw } = await params;
  const attributeId = parsePositiveEntityId(raw);
  if (attributeId === null) {
    return Response.json({ error: "Not an attribute id." }, { status: 400 });
  }

  // A database failure throws: Next answers 500, uncached, and Sentry records
  // it through `onRequestError`.
  const rows = await prisma.typeAttribute.findMany({
    select: {
      value: true,
      type: {
        select: {
          typeId: true,
          name: true,
          published: true,
          group: {
            select: {
              groupId: true,
              name: true,
              category: { select: { categoryId: true, name: true } },
            },
          },
        },
      },
    },
    where: { attributeId, isDeleted: false },
  });

  const types: DogmaAttributeTypeRow[] = rows.map(({ value, type }) => ({
    typeId: type.typeId,
    name: type.name,
    published: type.published,
    groupId: type.group.groupId,
    groupName: type.group.name,
    categoryId: type.group.category.categoryId,
    categoryName: type.group.category.name,
    value,
  }));
  return Response.json(types, { headers: { "Cache-Control": CACHE_OK } });
}
