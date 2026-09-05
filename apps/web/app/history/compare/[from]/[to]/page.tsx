import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Loader } from "@mantine/core";

import { getCachedHistoryIndex } from "~/lib/history-cache";
import { parsePositiveEntityId } from "~/lib/routeParams";
import CompareBuildsClient from "../../page.client";

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ from: string; to: string }> }>) {
  const { from, to } = await params;
  const fromBuild = parsePositiveEntityId(from);
  const toBuild = parsePositiveEntityId(to);
  if (fromBuild === null || toBuild === null) return {};
  return {
    title: `Compare builds ${fromBuild} → ${toBuild} — Change History`,
    description: `What changed in EVE Online static data between build ${fromBuild} and build ${toBuild}.`,
    alternates: { canonical: `/history/compare/${fromBuild}/${toBuild}` },
  };
}

async function CompareData({
  params,
}: Readonly<{ params: Promise<{ from: string; to: string }> }>) {
  await connection();
  const { from, to } = await params;
  // Both segments are `Build.buildNumber` (Int @id), so the entity-id parser is
  // the right shape check. The previous `Number.isFinite` test passed the pair
  // through as `undefined` on garbage, which rendered the bare build picker at
  // HTTP 200 — a soft 404, and one reachable from any spelling of a valid pair.
  const fromBuild = parsePositiveEntityId(from);
  const toBuild = parsePositiveEntityId(to);
  if (fromBuild === null || toBuild === null) notFound();
  let builds: { build: number; date: string | null }[] = [];
  try {
    const index = await getCachedHistoryIndex();
    builds = index.builds.map((b) => ({ build: b.build, date: b.date }));
  } catch {
    builds = []; // DB unreachable ⇒ render with an empty picker rather than crash
  }
  return <CompareBuildsClient builds={builds} from={fromBuild} to={toBuild} />;
}

export default function Page({
  params,
}: Readonly<{ params: Promise<{ from: string; to: string }> }>) {
  return (
    <Suspense fallback={<Loader />}>
      <CompareData params={params} />
    </Suspense>
  );
}
