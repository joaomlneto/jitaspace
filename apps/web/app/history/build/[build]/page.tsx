import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Loader } from "@mantine/core";

import { pageMetadata } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import BuildHistoryClient from "./page.client";

// A build number is `Build.buildNumber Int @id` in the history schema — the
// same shape as an entity id, so the same parser applies. Before this the
// segment was coerced with `Number()`, so `/history/build/03383521` and
// `/history/build/nonsense` both rendered HTTP 200: the first a duplicate of
// the real build page, the second an empty state — a soft 404.
export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ build: string }>;
}>) {
  const { build } = await params;
  const buildNumber = parsePositiveEntityId(build);
  if (buildNumber === null) return {};
  return pageMetadata({
    title: `Build ${buildNumber} — Change History`,
    description: `Everything that changed in EVE Online client build ${buildNumber}.`,
    path: `/history/build/${buildNumber}`,
    badge: "Change History",
  });
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ build: string }>;
}>) {
  const { build } = await params;
  const buildNumber = parsePositiveEntityId(build);
  if (buildNumber === null) notFound();
  return <BuildHistoryClient build={buildNumber} />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ build: string }>;
}>) {
  return (
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
