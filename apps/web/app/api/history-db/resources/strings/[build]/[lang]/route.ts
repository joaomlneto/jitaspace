import { historyDb } from "~/lib/history-db";

/** GET /api/history-db/resources/strings/{build}/{lang} — StringChanges. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ build: string; lang: string }> },
) {
  const { build, lang } = await params;
  const buildNumber = Number(build);
  const rows = await historyDb.change.findMany({
    where: { build: { buildNumber }, collection: { name: `strings:${lang}` } },
    select: { op: true, data: true, entity: { select: { eveId: true } } },
  });
  if (rows.length === 0)
    return Response.json({ error: "no string changes" }, { status: 404 });

  return Response.json(
    rows.map((r) => {
      const data = (r.data ?? {}) as { from?: string; to?: string };
      return {
        id: r.entity.eveId,
        kind: r.op === "modified" ? "changed" : r.op,
        from: data.from,
        to: data.to,
      };
    }),
  );
}
