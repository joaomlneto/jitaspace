import { historyDb } from "~/lib/history-db";

const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** GET /api/history-db/index — the HistoryIndex (SDE only; strings live elsewhere). */
export async function GET() {
  const notStr = { name: { not: { startsWith: "strings:" } } };
  const [builds, collections, grouped, entities] = await Promise.all([
    historyDb.build.findMany({
      orderBy: { buildNumber: "asc" },
      select: { buildNumber: true, releasedAt: true },
    }),
    historyDb.collection.findMany({ where: notStr, select: { id: true, name: true } }),
    historyDb.change.groupBy({
      by: ["buildNumber", "collectionId"],
      where: { collection: notStr },
      _count: true,
    }),
    historyDb.entity.findMany({
      where: { kind: { not: { startsWith: "string:" } } },
      select: { kind: true, eveId: true },
    }),
  ]);

  const colName = new Map(collections.map((c) => [c.id, c.name]));
  const perBuild = new Map<number, Record<string, number>>();
  for (const g of grouped) {
    const name = colName.get(g.collectionId);
    if (!name) continue;
    const m = perBuild.get(g.buildNumber) ?? {};
    m[name] = g._count;
    perBuild.set(g.buildNumber, m);
  }

  const entityIdsByType: Record<string, number[]> = {};
  for (const e of entities) (entityIdsByType[e.kind] ??= []).push(e.eveId);
  for (const arr of Object.values(entityIdsByType)) arr.sort((a, b) => a - b);

  const buildsOut = builds.map((b) => {
    const byCollection = perBuild.get(b.buildNumber) ?? {};
    const changeCount = Object.values(byCollection).reduce((a, c) => a + c, 0);
    return {
      build: b.buildNumber,
      date: ymd(b.releasedAt),
      changeCount,
      ...(changeCount ? { byCollection } : {}),
    };
  });

  return Response.json({
    generatedAt: new Date().toISOString(),
    collections: collections.map((c) => c.name),
    entityTypes: Object.keys(entityIdsByType),
    builds: buildsOut,
    entityIdsByType,
  });
}
