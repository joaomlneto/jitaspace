import { historyDb } from "~/lib/history-db";

const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
interface Counts {
  added: number;
  changed: number;
  removed: number;
}
const opKey = (op: "added" | "modified" | "removed") =>
  op === "modified" ? "changed" : op;

/** GET /api/history-db/resources/index — the ResourceIndex (file + string counts per build). */
export async function GET() {
  const strFilter = { name: { startsWith: "strings:" } };
  const [fileAgg, strColls, strAgg, builds] = await Promise.all([
    historyDb.fileChange.groupBy({ by: ["buildNumber", "op"], _count: true }),
    historyDb.collection.findMany({ where: strFilter, select: { id: true, name: true } }),
    historyDb.change.groupBy({
      by: ["buildNumber", "collectionId", "op"],
      where: { collection: strFilter },
      _count: true,
    }),
    historyDb.build.findMany({ select: { buildNumber: true, releasedAt: true } }),
  ]);

  const buildInfo = new Map(builds.map((b) => [b.buildNumber, b]));
  const langOf = new Map(strColls.map((c) => [c.id, c.name.replace("strings:", "")]));
  const languages = strColls.map((c) => c.name.replace("strings:", "")).sort();

  interface Acc {
    files: Counts;
    strings: Record<string, Counts>;
  }
  const perBuild = new Map<number, Acc>();
  const ensure = (bid: number): Acc => {
    let a = perBuild.get(bid);
    if (!a) {
      a = { files: { added: 0, changed: 0, removed: 0 }, strings: {} };
      perBuild.set(bid, a);
    }
    return a;
  };
  for (const g of fileAgg) ensure(g.buildNumber).files[opKey(g.op)] += g._count;
  for (const g of strAgg) {
    const lang = langOf.get(g.collectionId);
    if (!lang) continue;
    const a = ensure(g.buildNumber);
    (a.strings[lang] ??= { added: 0, changed: 0, removed: 0 })[opKey(g.op)] += g._count;
  }

  const out: { build: number; date: string | null; files: Counts; strings: Record<string, Counts> }[] = [];
  for (const [bid, v] of perBuild) {
    const b = buildInfo.get(bid);
    if (!b) continue;
    out.push({ build: b.buildNumber, date: ymd(b.releasedAt), files: v.files, strings: v.strings });
  }
  out.sort((a, b) => a.build - b.build);

  return Response.json({ generatedAt: new Date().toISOString(), languages, builds: out });
}
