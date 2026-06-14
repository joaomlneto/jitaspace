import { historyDb } from "~/lib/history-db";

const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** GET /api/history-db/entity/{entityType}/{id} — the EntityTimeline. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityType: string; id: string }> },
) {
  const { entityType, id } = await params;
  const eveId = Number(id);
  if (!Number.isInteger(eveId))
    return Response.json({ error: `invalid id: ${id}` }, { status: 404 });

  const rows = await historyDb.change.findMany({
    where: { entity: { kind: entityType, eveId } },
    select: {
      op: true,
      data: true,
      build: { select: { buildNumber: true, releasedAt: true } },
      collection: { select: { name: true } },
    },
    orderBy: { build: { buildNumber: "asc" } },
  });
  if (rows.length === 0)
    return Response.json({ error: "no history" }, { status: 404 });

  const events = rows.map((r) => ({
    build: r.build.buildNumber,
    date: ymd(r.build.releasedAt),
    collection: r.collection.name,
    v: 1 as const,
    kind: r.op,
    ...(r.op === "modified" ? { fields: r.data } : { values: r.data }),
  }));

  return Response.json({ entityType, entityId: eveId, events });
}
