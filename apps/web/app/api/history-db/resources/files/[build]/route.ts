import { historyDb } from "~/lib/history-db";

/** GET /api/history-db/resources/files/{build} — the FileDiff. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ build: string }> },
) {
  const { build } = await params;
  const buildNumber = Number(build);
  const rows = await historyDb.fileChange.findMany({
    where: { build: { buildNumber } },
    select: { path: true, op: true },
  });
  if (rows.length === 0)
    return Response.json({ error: "no file changes" }, { status: 404 });

  return Response.json({
    added: rows.filter((r) => r.op === "added").map((r) => r.path),
    changed: rows.filter((r) => r.op === "modified").map((r) => r.path),
    removed: rows.filter((r) => r.op === "removed").map((r) => r.path),
  });
}
