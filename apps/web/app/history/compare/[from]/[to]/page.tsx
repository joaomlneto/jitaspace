import { Suspense } from "react";
import { connection } from "next/server";
import { Loader } from "@mantine/core";

import { getCachedHistoryIndex } from "~/lib/history-cache";
import CompareBuildsClient from "../../page.client";

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ from: string; to: string }> }>) {
  const { from, to } = await params;
  return {
    title: `Compare builds ${from} → ${to} — Change History`,
    description: `What changed in EVE Online static data between build ${from} and build ${to}.`,
  };
}

async function CompareData({
  params,
}: Readonly<{ params: Promise<{ from: string; to: string }> }>) {
  await connection();
  const { from, to } = await params;
  const fromNum = Number(from);
  const toNum = Number(to);
  let builds: { build: number; date: string | null }[] = [];
  try {
    const index = await getCachedHistoryIndex();
    builds = index.builds.map((b) => ({ build: b.build, date: b.date }));
  } catch {
    builds = []; // DB unreachable ⇒ render with an empty picker rather than crash
  }
  return (
    <CompareBuildsClient
      builds={builds}
      from={Number.isFinite(fromNum) ? fromNum : undefined}
      to={Number.isFinite(toNum) ? toNum : undefined}
    />
  );
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
